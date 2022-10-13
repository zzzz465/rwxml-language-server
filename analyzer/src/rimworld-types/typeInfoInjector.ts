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

    const classAttributeValue = xmlNode.attribs['Class']?.value
    const specificTypeInfo = this.getDerivedTypeOf(classAttributeValue ?? '', typeInfo)

    if (specificTypeInfo) {
      return this.injectType(xmlNode, specificTypeInfo, fieldInfo)
    }

    const injectable = Injectable.toInjectable(xmlNode, typeInfo, fieldInfo)

    if (typeInfo.isList() || typeInfo.isDictionary()) {
      const enumerableType = typeInfo.getEnumerableType()

      if (enumerableType) {
        for (const childNode of injectable.ChildElementNodes) {
          this.injectType(childNode, enumerableType)
        }
      }
    } else if (typeInfo.isEnum) {
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
    } else {
      for (const childNode of injectable.ChildElementNodes) {
        if (childNode.name) {
          const fieldInfo = injectable.typeInfo.getField(childNode.name)

          if (fieldInfo) {
            this.injectType(childNode, fieldInfo.fieldType, fieldInfo)
          }
        }
      }
    }

    return injectable
  }

  private getDerivedTypeOf(classAttributeValue: string, baseClass: TypeInfo) {
    const typeInfo = this.typeInfoMap.getTypeInfoByName(classAttributeValue)
    if (typeInfo?.isDerivedFrom(baseClass)) {
      return typeInfo
    }
  }

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
}
