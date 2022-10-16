import $ from 'cheerio'
import { Document, Element, NodeWithChildren, replaceNode, Text } from '../parser'
import { TypedElement } from '../parser/domhandler/typedElement'
import { Def } from './def'
import { DefReference, DefReferenceType } from './defReference'
import { FieldInfo } from './fieldInfo'
import { TypeInfo } from './typeInfo'
import { TypeInfoMap } from './typeInfoMap'

$._options.xmlMode = true

export class TypeInfoInjector {
  constructor(private typeInfoMap: TypeInfoMap) {}

  inject(document: Document): { document: Document; defs: Def[] } {
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

  injectDefType(parent: NodeWithChildren, xmlNode: Element): boolean {
    const elementName = xmlNode.name
    const defTypeInfo = this.typeInfoMap.getTypeInfoByName(elementName)

    if (defTypeInfo) {
      const def = new Def(xmlNode.name, xmlNode.attribs, defTypeInfo, parent, xmlNode.childNodes)
      return true
    } else {
      return false
    }
  }

  injectType(parent: TypedElement, curr: Element, typeInfo: TypeInfo, fieldInfo?: FieldInfo): void {
    console.assert(!!typeInfo, `typeInfo for xmlNode ${curr.name} is null or undefined`)

    const overridedTypeInfo = this.getOverridedTypeInfo(curr, typeInfo)
    if (overridedTypeInfo) {
      return this.injectType(parent, curr, overridedTypeInfo, fieldInfo)
    }

    const typedCurr = new TypedElement(curr.name, curr.attribs, parent, typeInfo, fieldInfo, curr.childNodes)
    const childIndex = parent.childNodes.indexOf(curr)
    if (childIndex === -1) {
      // TODO: error handle
    }

    replaceNode(curr, typedCurr)

    if (typeInfo.isListStructured()) {
      const enumerableType = typeInfo.getEnumerableType()
      if (enumerableType) {
        if (enumerableType.customLoader()) {
          return curr.ChildElementNodes.forEach((childNode) => this.injectCustomLoaderType(childNode, enumerableType))
        }

        return typedCurr.ChildElementNodes.filter((node) => node.tagName === 'li').forEach((node) =>
          this.injectType(typedCurr, node, enumerableType)
        )
      }
    }

    if (typeInfo.isEnum) {
      if (typedCurr.isLeafNode()) {
        // prettier-ignore
        return typedCurr.childNodes
          .flatMap(node => node instanceof Text ? [node] : [])
          .forEach(node => node.typeInfo = typeInfo)
      } else {
        //prettier-ignore
        return typedCurr
          .ChildElementNodes
          .filter((node) => node.tagName === 'li')
          .forEach((node) => this.injectType(typedCurr, node, typeInfo))
      }
    }

    return typedCurr.ChildElementNodes.forEach((childNode) => {
      const fieldInfo = typeInfo.getField(childNode.tagName)

      if (fieldInfo) {
        this.injectType(typedCurr, childNode, fieldInfo.fieldType, fieldInfo)
      }
    })
  }

  private injectCustomLoaderType(xmlNode: Element, typeInfo: TypeInfo): void {
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
        this.injectDefRefType(xmlNode, typeInfo)
        return

      case 'DefHyperlink':
        this.injectHyperLinkType(xmlNode, typeInfo)
        return
    }
  }

  // special case where tag is defName, and value is an integer.
  private injectDefRefType(xmlNode: Element, typeInfo: TypeInfo): DefReference {
    return DefReference.into(xmlNode, typeInfo, DefReferenceType.RefWithCount)
  }

  // speical case where tag is DefType, and value is defName.
  private injectHyperLinkType(xmlNode: Element, typeInfo: TypeInfo): DefReference {
    return DefReference.into(xmlNode, typeInfo, DefReferenceType.Hyperlink)
  }

  private getOverridedTypeInfo(xmlNode: Element, typeInfo: TypeInfo): TypeInfo | null {
    const classAttributeValue = xmlNode.attribs['Class']?.value

    return this.getDerivedTypeOf(classAttributeValue ?? '', typeInfo) ?? null
  }

  private getDerivedTypeOf(classAttributeValue: string, baseClass: TypeInfo): TypeInfo | null {
    const typeInfo = this.typeInfoMap.getTypeInfoByName(classAttributeValue)
    if (typeInfo?.isDerivedFrom(baseClass)) {
      return typeInfo
    }

    return null
  }
}
