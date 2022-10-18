import $ from 'cheerio'
import { Document, Element, NodeWithChildren, replaceNode } from '../parser'
import { DefReference, DefReferenceType } from './defReference'
import { Def, TypedElement } from './typedElement'
import { TypeInfoMap } from './typeInfoMap'
import { FieldInfo, TypeInfo } from './types'

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
    const elementName = xmlNode.tagName
    const defTypeInfo = this.typeInfoMap.getTypeInfoByName(elementName)

    if (defTypeInfo) {
      const def = new Def(xmlNode.tagName, xmlNode.attribs, defTypeInfo, parent, xmlNode.childNodes)
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

    const typedCurr = new TypedElement(curr.tagName, curr.attribs, parent, typeInfo, fieldInfo, curr.childNodes)

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
        return curr.ChildElementNodes.forEach((childNode) =>
          this.injectCustomLoaderType(curr, childNode, enumerableType)
        )
      }

      return curr.ChildElementNodes.filter((childNode) => childNode.tagName === 'li').forEach((node) =>
        this.injectType(curr, node, enumerableType)
      )
    }
  }

  private processEnumStructured(curr: Def | TypedElement): void {
    if (
      curr.isLeafNode()
    ) {
      // prettier-ignore
      // NOTE: previously, there was an attempt to use a new type "TypedText",
      // but it doesn't fit well with most use cases.
      // so we just go back to old Text type.
    } else {
      //prettier-ignore
      return curr
        .ChildElementNodes
        .filter((node) => node.tagName === 'li')
        .forEach((node) => this.injectType(curr, node, curr.typeInfo))
    }
  }

  private injectCustomLoaderType(parent: Def | TypedElement, xmlNode: Element, typeInfo: TypeInfo): void {
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

    // replace to typedElement is required to avoid forced casting
    // NOTE: should I do this?
    const typedElement = new TypedElement(
      xmlNode.tagName,
      xmlNode.attribs,
      parent,
      typeInfo,
      undefined,
      xmlNode.childNodes
    )

    replaceNode(xmlNode, typedElement)

    switch (typeInfo.className) {
      case 'StatModifier':
      case 'SkillRequirement':
      case 'ThingDefCountClass':
      case 'PawnGenOption':
        this.injectDefRefType(typedElement)
        return

      case 'DefHyperlink':
        this.injectHyperLinkType(typedElement)
        return
    }
  }

  // special case where tag is defName, and value is an integer.
  private injectDefRefType(target: TypedElement): void {
    const newNode = DefReference.from(target, DefReferenceType.RefWithCount)

    replaceNode(target, newNode)
  }

  // speical case where tag is DefType, and value is defName.
  private injectHyperLinkType(target: TypedElement): void {
    const newNode = DefReference.from(target, DefReferenceType.Hyperlink)

    replaceNode(target, newNode)
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
