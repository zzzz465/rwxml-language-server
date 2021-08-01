import { ValidXMLNode, XMLNode } from '../parser/XMLNode'
import { TypeInfo } from './typeInfo'
import { FieldInfo } from './fieldInfo'
import { isDef } from './def'

type Field = {
  fieldInfo: FieldInfo
  injectable: Injectable
}

export interface Injectable extends ValidXMLNode {
  readonly typeInfo: TypeInfo
  readonly fields: Map<string, Field>
  readonly parent: Injectable
  isLeafNode(): boolean
  buildDefPath(): string
  getFieldInfo(): FieldInfo | undefined
}

function buildDefPath(this: Injectable) {
  if (isDef(this)) {
    return this.name + '.' + this.defName
  } else {
    if (this.parent.typeInfo.metadata.enumerable) {
      // TODO: add rule which doesn't use <li> node
      const index = this.parent.children.indexOf(this)
      return this.parent.buildDefPath() + '.' + String(index)
    } else {
      return this.parent.buildDefPath() + '.' + this.name
    }
  }
}

function getFieldInfo(this: Injectable) {
  this.parent
}

// TODO: using field list of Type Injectable to automate type guard

export function isInjectable(xmlNode: XMLNode): xmlNode is Injectable {
  return 'typeInfo' in xmlNode && 'fields' in xmlNode && 'isLeafNode' in xmlNode
}

export function toInjectable(xmlNode: XMLNode, typeInfo: TypeInfo): Injectable {
  const ret = Object.assign(xmlNode, { typeInfo }) as Injectable

  ret.isLeafNode = function (this: Injectable) {
    return this.children.length == 0
  }.bind(ret)

  ret.buildDefPath = buildDefPath.bind(ret)

  return ret
}

export function unInjectable(xmlNode: Injectable): XMLNode {
  delete (<any>xmlNode).typeInfo
  delete (<any>xmlNode).fields
  delete (<any>xmlNode).isLeafNode
  delete (<any>xmlNode).buildDefPath

  delete
  return xmlNode
}
