import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { TypedElement } from './typedElement'
import { Def } from './def'
import { FieldInfo } from './fieldInfo'
import { Document, Element, Text } from '../parser'
import $ from 'cheerio'
import { DefReference, DefReferenceType } from './defReference'

$._options.xmlMode = true

export class TypeInfoInjector {
  constructor(private typeInfoMap: TypeInfoMap) { }

  inject(document: Document) {
    const res = {
      document: document,
      defs: [] as Def[],
    }

    const root = $(document).children('Defs').get(0) // possible undefined, but type isn't showing

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

    const overridedTypeInfo = this.getOverridedTypeInfo(xmlNode, typeInfo)
    if (overridedTypeInfo) {
      return this.injectType(xmlNode, overridedTypeInfo, fieldInfo)
    }

    const injectable = TypedElement.toInjectable(xmlNode, typeInfo, fieldInfo)

    if (typeInfo.isListStructured()) {
      const enumerableType = typeInfo.getEnumerableType()
      if (enumerableType) {
        if (enumerableType.customLoader()) {
          return xmlNode.ChildElementNodes.forEach((childNode) => this.injectCustomLoaderType(childNode, enumerableType))
        }

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
