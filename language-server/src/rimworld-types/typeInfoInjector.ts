import { ValidXMLNode, XMLNode } from '../parser/XMLNode'
import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { Injectable, toInjectable } from './injectable'
import { XMLDocument } from '../parser/XMLDocument'
import { Def, toDef } from './def'

export default class TypeInfoInjector {
  // inject defType to xmlNode
  static injectDefType(xmlNode: XMLNode, typeInfoMap: TypeInfoMap): boolean {
    if (!xmlNode.validNode) {
      return false
    }

    const elementName = xmlNode.name
    const defTypeInfo = typeInfoMap.getTypeInfoByName(elementName)

    if (defTypeInfo) {
      TypeInfoInjector.injectType(xmlNode, defTypeInfo, typeInfoMap)
      const def = toInjectable(xmlNode, defTypeInfo)
      toDef(def)
      return true
    } else {
      return false
    }
  }

  // recursively inject all typeInfo to xmlNode
  static injectType(xmlNode: ValidXMLNode, typeInfo: TypeInfo, typeInfoMap: TypeInfoMap): void {
    Object.assign<XMLNode, Partial<Injectable>>(xmlNode, { typeInfo })

    const injectable = xmlNode as Injectable

    for (const childNode of xmlNode.children) {
      if (childNode.validNode) {
        const elementName = injectable.name
        const correspondingTypeInfo = injectable.typeInfo.fields.get(elementName)

        if (correspondingTypeInfo) {
          TypeInfoInjector.injectType(childNode, correspondingTypeInfo.typeInfo, typeInfoMap)
          toInjectable(childNode, correspondingTypeInfo.typeInfo)
        }
      }
    }
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
