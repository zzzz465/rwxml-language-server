import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { TypedElement } from './typedElement'
import { Def } from './def'
import { FieldInfo } from './fieldInfo'
import { Document, Element, Text } from '../parser'
import { DefReference, DefReferenceType } from './defReference'

export class TypeInfoInjector {
  constructor(private typeInfoMap: TypeInfoMap) { }

  inject(document: Document) {
    const res = {
      document: document,
      defs: [] as Def[],
    }

    const root = document.children.find(node => node instanceof Element && node.name === 'Defs') as Element | undefined

    if (root instanceof Element) {
      if (root && root.name === 'Defs') {
        for (const node of root.ChildElementNodes) {
          const success = this.injectDefType(node)

          if (success) {
            res.defs.push(node as Def)
          }
        }
      }
    }

    return res
  }

  injectDefType(xmlNode: Element): boolean {
    const elementName = xmlNode.name
    const defTypeInfo = this.typeInfoMap.getTypeInfoByName(elementName)

    if (defTypeInfo) {
      this.injectType(xmlNode, defTypeInfo)
      Def.toDef(xmlNode as TypedElement)
      return true
    } else {
      return false
    }
  }

  injectType(xmlNode: Element, typeInfo: TypeInfo, fieldInfo?: FieldInfo): void {
    console.assert(!!typeInfo, `typeInfo for xmlNode ${xmlNode.name} is null or undefined`)

    if (typeInfo.isNullable()) {
      const nullableType = typeInfo.getNullableType()
      if (nullableType) {
        return this.injectType(xmlNode, nullableType, fieldInfo)
      }
    }

    if (typeInfo.fullName.startsWith('RimWorld.QuestGen.SlateRef`1') && typeInfo.genericArguments.length > 0) {
      const slateRefType = typeInfo.genericArguments[0]
      if (slateRefType) {
        return this.injectType(xmlNode, slateRefType, fieldInfo)
      }
    }

    const overridedTypeInfo = this.getOverridedTypeInfo(xmlNode, typeInfo)
    if (overridedTypeInfo) {
      return this.injectType(xmlNode, overridedTypeInfo, fieldInfo)
    }

    const injectable = TypedElement.toInjectable(xmlNode, typeInfo, fieldInfo)

    if (typeInfo.isListStructured()) {
      const enumerableType = typeInfo.getEnumerableType()
      if (enumerableType) {
        if (enumerableType.customLoader()) {
          xmlNode.ChildElementNodes.forEach((childNode) => {
            if (childNode.tagName !== 'li') {
              this.injectType(childNode, enumerableType)
            }
          })
          return xmlNode.ChildElementNodes.forEach((childNode) => this.injectCustomLoaderType(childNode, enumerableType))
        }

        const isMap = typeInfo.isMapStructured()
        const [, valueType] = isMap ? (typeInfo.getMapGenTypes() ?? []) : []

        xmlNode.ChildElementNodes.forEach((childNode) => {
          if (childNode.tagName !== 'li') {
            // 如果是 Map，注入值的类型；否则（如 skillGains, forcedTraits）注入列表项自身的类型作为兜底
            this.injectType(childNode, valueType ?? enumerableType)
          }
        })

        return injectable.ChildElementNodes
          .filter(node => node.tagName === 'li')
          .forEach(node => this.injectType(node, enumerableType))
      }
    }

    if (typeInfo.isEnum) {
      if (injectable.isLeafNode()) {
        // prettier-ignore
        return injectable.childNodes
          .flatMap(node => node instanceof Text ? [node] : [])
          .forEach(node => node.typeInfo = typeInfo)
      } else {
        //prettier-ignore
        return injectable
          .ChildElementNodes
          .filter((node) => node.tagName === 'li')
          .forEach((node) => this.injectType(node, typeInfo))
      }
    }

    return injectable.ChildElementNodes.forEach((childNode) => {
      const fieldInfo = typeInfo.getField(childNode.tagName)

      if (fieldInfo) {
        this.injectType(childNode, fieldInfo.fieldType, fieldInfo)
      } else if (childNode.tagName === 'li') {
        // heuristic: for li nodes that doesn't matched any field, inject parent type.
        this.injectType(childNode, typeInfo)
      } else if (childNode.tagName === 'thing' || childNode.tagName === 'points' || childNode.tagName === 'tag' || childNode.tagName === 'chance') {
        // Heuristic: allow specific 'wrapper' tags to inherit the current type if no field matches.
        // This is common in QuestGen and Bossgroups where metadata is slightly off.
        this.injectType(childNode, typeInfo)
      }
    })
  }

  private injectCustomLoaderType(xmlNode: Element, typeInfo: TypeInfo) {
    /*
    - direct def references
      - <statBases>
      - <equippedStatModifier>
      - <costList>
      - <skillRequirements>
    - defType name as key and defName as value
      - <XXXHyperLinks>
    - TODO
    */

    switch (typeInfo.className) {
      case 'StatModifier':
      case 'SkillRequirement':
      case 'ThingDefCountClass':
      case 'PawnGenOption':
        return this.injectDefRefType(xmlNode, typeInfo)

      case 'DefHyperlink':
        return this.injectHyperLinkType(xmlNode, typeInfo)
    }
  }

  // special case where tag is defName, and value is an integer.
  private injectDefRefType(xmlNode: Element, typeInfo: TypeInfo) {
    return DefReference.into(xmlNode, typeInfo, DefReferenceType.RefWithCount)
  }

  // speical case where tag is DefType, and value is defName.
  private injectHyperLinkType(xmlNode: Element, typeInfo: TypeInfo) {
    return DefReference.into(xmlNode, typeInfo, DefReferenceType.Hyperlink)
  }

  private getOverridedTypeInfo(xmlNode: Element, typeInfo: TypeInfo): TypeInfo | null {
    const classAttributeValue = xmlNode.attribs['Class']?.value

    return this.getDerivedTypeOf(classAttributeValue ?? '', typeInfo) ?? null
  }

  private getDerivedTypeOf(classAttributeValue: string, baseClass: TypeInfo) {
    const typeInfo = this.typeInfoMap.getTypeInfoByName(classAttributeValue)
    if (typeInfo?.isDerivedFrom(baseClass)) {
      return typeInfo
    }
  }
}
