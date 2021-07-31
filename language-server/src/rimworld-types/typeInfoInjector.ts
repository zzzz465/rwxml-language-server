import { ValidXMLNode, XMLNode } from '../parser/XMLNode'
import { TypeInfoMap } from './typeInfoMap'
import { TypeInfo } from './typeInfo'
import { Injectable } from './injectable'

// inject defType to xmlNode
export function injectDefType(xmlNode: XMLNode, typeInfoMap: TypeInfoMap): boolean {
  if (!xmlNode.validNode) {
    return false
  }

  const elementName = xmlNode.name
  const defTypeInfo = typeInfoMap.getTypeInfoByName(elementName)

  if (defTypeInfo) {
    inject(xmlNode, defTypeInfo, typeInfoMap)
    return true
  } else {
    return false
  }
}

// recursively inject all typeInfo to xmlNode
export function inject(xmlNode: ValidXMLNode, typeInfo: TypeInfo, typeInfoMap: TypeInfoMap): void {
  Object.assign<XMLNode, Partial<Injectable>>(xmlNode, { typeInfo })

  const injectable = xmlNode as Injectable

  for (const childNode of xmlNode.children) {
    if (childNode.validNode) {
      const elementName = injectable.name
      const correspondingTypeInfo = injectable.typeInfo.childNodes.get(elementName)

      if (correspondingTypeInfo) {
        inject(childNode, correspondingTypeInfo, typeInfoMap)
      }
    }
  }
}
