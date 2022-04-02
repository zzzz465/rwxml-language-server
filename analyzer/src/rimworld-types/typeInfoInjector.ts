import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { Injectable } from './injectable'
import { Def } from './def'
import { FieldInfo } from './fieldInfo'
import { Document, Element } from '../parser'
import $ from 'cheerio'

$._options.xmlMode = true

export class TypeInfoInjector {
  constructor(private typeInfoMap: TypeInfoMap) {}

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
  injectType(xmlNode: Element, typeInfo: TypeInfo, fieldInfo?: FieldInfo): Injectable {
    const classAttribute = xmlNode.attribs['Class']?.value

    // support <li Class="XXXCompProperties_YYY">
    if (classAttribute) {
      const ClassTypeInfo = this.typeInfoMap.getTypeInfoByName(classAttribute)
      if (ClassTypeInfo) {
        typeInfo = ClassTypeInfo
      }
    }

    console.assert(!!typeInfo, `typeInfo for xmlNode ${xmlNode.name} is null or undefined`)

    const injectable = Injectable.toInjectable(xmlNode, typeInfo, fieldInfo)
    if (typeInfo.isEnumerable()) {
      // <li> types
      const listGenericType = typeInfo.genericArguments[0] as TypeInfo | undefined

      if (listGenericType) {
        for (const childNode of injectable.ChildElementNodes) {
          const classAttributeValue = childNode.attribs['Class']?.value
          const specificTypeInfo = this.getDerivedTypeOf(classAttributeValue ?? '', listGenericType)

          // use Specific typeInfo annotated in attribute Class="", use generic otherwise.
          const injectType = specificTypeInfo ?? listGenericType
          this.injectType(childNode, injectType)
        }
      }
    } else if (typeInfo.isEnum && !injectable.parent.typeInfo.isEnum) {
      // 1. check type is enum
      // 2. prevent recursive injection if parent is already enum.
      for (const childNode of injectable.ChildElementNodes) {
        if (childNode.tagName === 'li') {
          this.injectType(childNode, typeInfo)
        }
      }
    } else {
      for (const childNode of injectable.ChildElementNodes) {
        if (childNode.name) {
          const fieldInfo = injectable.typeInfo.fields[childNode.name]

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
