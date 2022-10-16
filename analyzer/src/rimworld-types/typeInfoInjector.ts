import $ from 'cheerio'
import { Document, Element, NodeWithChildren, replaceNode, Text } from '../parser'
import { Def } from './def'
import { DefReference, DefReferenceType } from './defReference'
import { FieldInfo } from './fieldInfo'
import { TypedElement } from './typedElement'
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
          const def = this.injectDefType(root, node)
          if (def) {
            res.defs.push(def)
          }
        }
      }
    }

    return res
  }

  injectDefType(parent: NodeWithChildren, xmlNode: Element): Def | null {
    const elementName = xmlNode.name
    const defTypeInfo = this.typeInfoMap.getTypeInfoByName(elementName)

    if (defTypeInfo) {
      const def = new Def(xmlNode.name, xmlNode.attribs, defTypeInfo, parent, xmlNode.childNodes)
      replaceNode(xmlNode, def)
      this.processNode(def)

      return def
    }

    return null
  }

  injectType(parent: Def | TypedElement, curr: Element, typeInfo: TypeInfo, fieldInfo?: FieldInfo): void {
    const overridedTypeInfo = this.getOverridedTypeInfo(curr, typeInfo)
    if (overridedTypeInfo) {
      return this.injectType(parent, curr, overridedTypeInfo, fieldInfo)
    }

    const typedCurr = new TypedElement(curr.name, curr.attribs, parent, typeInfo, fieldInfo, curr.childNodes)

    replaceNode(curr, typedCurr)

    this.processNode(typedCurr)
  }

  private processNode(curr: Def | TypedElement): void {
    const typeInfo = curr.typeInfo

    if (typeInfo.isListStructured()) {
      this.processListStructured(curr)
    }

    if (typeInfo.isEnum) {
      this.processEnumStructured(curr)
    }

    this.processMapStructured(curr)
  }

  private processMapStructured(curr: Def | TypedElement): void {
    for (const childNode of curr.ChildElementNodes) {
      const fieldInfo = curr.typeInfo.getField(childNode.tagName)

      if (fieldInfo) {
        this.injectType(curr, childNode, fieldInfo.fieldType, fieldInfo)
      }
    }
  }

  private processListStructured(curr: Def | TypedElement): void {
    const enumerableType = curr.typeInfo.getEnumerableType()
    if (enumerableType) {
      if (enumerableType.customLoader()) {
        return curr.ChildElementNodes.forEach((childNode) => this.injectCustomLoaderType(childNode, enumerableType))
      }

      return curr.ChildElementNodes.filter((childNode) => childNode.tagName === 'li').forEach((node) =>
        this.injectType(curr, node, enumerableType)
      )
    }
  }

  private processEnumStructured(curr: Def | TypedElement): void {
    if (curr.isLeafNode()) {
      // prettier-ignore
      return curr.childNodes
        .flatMap(node => node instanceof Text ? [node] : [])
        .forEach(node => node.typeInfo = curr.typeInfo)
    } else {
      //prettier-ignore
      return curr
        .ChildElementNodes
        .filter((node) => node.tagName === 'li')
        .forEach((node) => this.injectType(curr, node, curr.typeInfo))
    }
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
