import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { Injectable } from './injectable'
import { Def } from './def'
import { FieldInfo } from './fieldInfo'
import { Document, Element, Text } from '../parser'
import $ from 'cheerio'

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
      Def.toDef(xmlNode as Injectable)
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

    const injectable = Injectable.toInjectable(xmlNode, typeInfo, fieldInfo)

    if (typeInfo.isListStructured()) {
      if (!typeInfo.isMapStructured() && typeInfo.customLoader()) {
        const genArg0 = typeInfo.getEnumerableType()
        if (genArg0) {
          return xmlNode.ChildElementNodes.forEach((childNode) => this.injectCustomLoaderType(childNode, genArg0))
        }
      }

      if (typeInfo.isMapStructured()) {
        const typePair = typeInfo.getMapGenTypes()
        if (typePair) {
          const [keyType, valueType] = typePair

          return injectable.ChildElementNodes
            .filter(node => node.tagName === 'li')
            .forEach(node => {
              const keyNode = node.ChildElementNodes.find(node => node.tagName === 'key')
              if (keyNode) {
                this.injectType(keyNode, keyType)
              }

              const valueNode = node.ChildElementNodes.find(node => node.tagName === 'value')
              if (valueNode) {
                this.injectType(valueNode, valueType)
              }
            })
        }
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
    // TODO
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
