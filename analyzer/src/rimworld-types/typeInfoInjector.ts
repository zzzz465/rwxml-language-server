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
      const def = this.injectType(xmlNode, defTypeInfo) as Injectable
      Def.toDef(def)
      return true
    } else {
      return false
    }
  }

  // recursively inject all typeInfo to xmlNode
  // TODO: refactor this hell.
  injectType(xmlNode: Element, typeInfo: TypeInfo, fieldInfo?: FieldInfo): Injectable {
    console.assert(!!typeInfo, `typeInfo for xmlNode ${xmlNode.name} is null or undefined`)

    const overridedTypeInfo = this.getOverridedTypeInfo(xmlNode, typeInfo)
    if (overridedTypeInfo) {
      return this.injectType(xmlNode, overridedTypeInfo, fieldInfo)
    }

    const injectable = Injectable.toInjectable(xmlNode, typeInfo, fieldInfo)

    if (typeInfo.isListStructured()) {
      if (typeInfo.isMapStructured()) {
        // TODO: pick out function that finds appropriate typeInfo for this node.
        typeInfo.genericArguments
        const typePair = typeInfo.getMapGenTypes()
        if (typePair) {
          const [keyType, valueType] = typePair

          injectable.ChildElementNodes
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

          return injectable
        }
      } else if (typeInfo.customLoader()) {
        // TODO: implement custom loader
        // in most cases, just treating 
      } else {
        const enumerableType = typeInfo.getEnumerableType()

        if (enumerableType) {
          injectable.ChildElementNodes
            .filter(node => node.tagName === 'li')
            .forEach(node =>
              this.injectType(node, enumerableType, fieldInfo)
            )
        }

        return injectable
      }

    }

    if (typeInfo.isEnum) {
      if (injectable.isLeafNode()) {
        // prettier-ignore
        injectable.childNodes
          .flatMap(node => node instanceof Text ? [node] : [])
          .forEach(node => node.typeInfo = typeInfo)
      } else {
        //prettier-ignore
        injectable
          .ChildElementNodes
          .filter((node) => node.tagName === 'li')
          .forEach((node) => this.injectType(node, typeInfo))
      }

      return injectable
    }

    for (const childNode of injectable.ChildElementNodes) {
      if (childNode.name) {
        const fieldInfo = injectable.typeInfo.getField(childNode.name)

        if (fieldInfo) {
          this.injectType(childNode, fieldInfo.fieldType, fieldInfo)
        }
      }
    }

    return injectable
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
