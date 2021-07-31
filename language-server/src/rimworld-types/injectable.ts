import { ValidXMLNode, XMLNode } from '../parser/XMLNode'
import { TypeInfo } from './typeInfo'

export interface Injectable extends ValidXMLNode {
  readonly typeInfo: TypeInfo
}

export function isInjectable(xmlNode: XMLNode): xmlNode is Injectable {
  return 'typeInfo' in xmlNode
}

export function toInjectable(xmlNode: XMLNode, typeInfo: TypeInfo): Injectable {
  return Object.assign(xmlNode, { typeInfo }) as Injectable
}

export function unInjectable(xmlNode: Injectable): XMLNode {
  delete (<any>xmlNode).typeInfo

  return xmlNode
}
