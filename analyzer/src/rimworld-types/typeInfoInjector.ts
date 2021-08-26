import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { Injectable } from './injectable'
import { Def } from './def'
import { FieldInfo } from './fieldInfo'
import { Document, Element } from '../parser'

export class TypeInfoInjector {
  constructor(private typeInfoMap: TypeInfoMap) {}

  injectDefType(xmlNode: Element): boolean {
    const elementName = xmlNode.name
    const defTypeInfo = this.typeInfoMap.getTypeInfoByName(elementName)

    if (defTypeInfo) {
      const def = this.injectType(xmlNode, defTypeInfo) as Def
      Def.toDef(def)
      return true
    } else {
      return false
    }
  }

  // recursively inject all typeInfo to xmlNode
  injectType(xmlNode: Element, typeInfo: TypeInfo, fieldInfo?: FieldInfo): Injectable {
    const classAttribute = xmlNode.attribs['ClassName']?.value

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
      const listGenericType = typeInfo.genericArguments[0]
      console.assert(!!listGenericType, `listGenericType for type: ${typeInfo.fullName} is invalid.`)

      for (const childNode of injectable.ChildElementNodes) {
        if (childNode.name) {
          this.injectType(childNode, listGenericType)
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

  inject(document: Document) {
    const res = {
      document: document,
      defs: [] as Def[],
    }

    const root = document.firstChild

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
