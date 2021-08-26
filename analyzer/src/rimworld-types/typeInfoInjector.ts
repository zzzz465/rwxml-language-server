import { XMLNode } from '../parser/XMLNode'
import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { Injectable } from './injectable'
import { XMLDocument } from '../parser/XMLDocument'
import { Def } from './def'
import { FieldInfo } from './fieldInfo'
import { Element } from '../parser'

export class TypeInfoInjector {
  constructor(private typeInfoMap: TypeInfoMap) {}

  injectDefType(xmlNode: XMLNode): boolean {
    if (!xmlNode.validNode) {
      return false
    }

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
  injectType(xmlNode: XMLNode, typeInfo: TypeInfo, fieldInfo?: FieldInfo): Injectable {
    const classAttribute = xmlNode.attributes.Class

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

      for (const childNode of injectable.children.filter((node: any) => node instanceof Element) as Element[]) {
        if (childNode.name) {
          this.injectType(childNode, listGenericType)
        }
      }
    } else {
      for (const childNode of injectable.children.filter((node: any) => node instanceof Element) as Element[]) {
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

  inject(xmlDocument: XMLDocument) {
    const res = {
      xmlDocument,
      defs: [] as Def[],
    }

    const root = xmlDocument.firstChild()

    if (root && root.name === 'Defs') {
      for (const xmlNode of root.children) {
        const success = this.injectDefType(xmlNode)

        if (success) {
          res.defs.push(xmlNode as Def)
        }
      }
    }

    return res
  }
}
