import { XMLNode } from '../parser/XMLNode'
import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { Injectable } from './injectable'
import { XMLDocument } from '../parser/XMLDocument'
import { Def } from './def'

export default class TypeInfoInjector {
  // inject defType to xmlNode
  static injectDefType(xmlNode: XMLNode, typeInfoMap: TypeInfoMap): boolean {
    if (!xmlNode.validNode) {
      return false
    }

    const elementName = xmlNode.name
    const defTypeInfo = typeInfoMap.getTypeInfoByName(elementName)

    if (defTypeInfo) {
      const def = TypeInfoInjector.injectType(xmlNode, defTypeInfo, typeInfoMap) as Def
      Def.toDef(def)
      return true
    } else {
      return false
    }
  }

  // recursively inject all typeInfo to xmlNode
  static injectType(xmlNode: XMLNode, typeInfo: TypeInfo, typeInfoMap: TypeInfoMap): Injectable {
    console.assert(!!typeInfo, `typeInfo for xmlNode ${xmlNode.name} is null or undefined`)

    const injectable = Injectable.toInjectable(xmlNode, typeInfo)
    if (typeInfo.isEnumerable()) {
      const listGenericType = typeInfo.genericArguments[0]
      console.assert(!!listGenericType, `listGenericType for type: ${typeInfo.fullName} is invalid.`)

      for (const childNode of injectable.children) {
        if (childNode.validNode && childNode.name) {
          TypeInfoInjector.injectType(childNode, listGenericType, typeInfoMap)
        }
      }
    } else {
      for (const childNode of injectable.children) {
        if (childNode.validNode && childNode.name) {
          const fieldInfo = injectable.typeInfo.fields[childNode.name]

          if (fieldInfo) {
            TypeInfoInjector.injectType(childNode, fieldInfo.fieldType, typeInfoMap)
          }
        }
      }
    }
    return injectable
  }

  static inject(xmlDocument: XMLDocument, typeInfoMap: TypeInfoMap) {
    const res = {
      xmlDocument,
      defs: [] as Def[],
    }

    const root = xmlDocument.firstChild()

    if (root && root.name === 'Defs') {
      for (const xmlNode of root.children) {
        const success = this.injectDefType(xmlNode, typeInfoMap)

        if (success) {
          res.defs.push(xmlNode as Def)
        }
      }
    }

    return res
  }
}
