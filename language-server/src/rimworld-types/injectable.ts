import { ValidXMLNode, XMLNode } from '../parser/XMLNode'
import { TypeInfo } from './typeInfo'
import { FieldInfo } from './fieldInfo'
import { Def, isDef } from './def'
import { Writable } from '../utils/types'

type Field = {
  fieldInfo: FieldInfo
  injectable: Injectable
}

export interface Injectable extends ValidXMLNode {
  readonly typeInfo: TypeInfo
  readonly fields: Map<string, Field>
  readonly parent: Injectable

  isLeafNode(): boolean

  getDefPath(): string

  getFieldInfo(): FieldInfo | undefined
}

function buildDefPath(this: Injectable) {
  if (isDef(this)) {
    return this.name + '.' + this.defName
  } else {
    if (this.parent.typeInfo.metadata.enumerable) {
      // TODO: add rule which doesn't use <li> node
      const index = this.parent.children.indexOf(this)
      return this.parent.getDefPath() + '.' + String(index)
    } else {
      return this.parent.getDefPath() + '.' + this.name
    }
  }
}

function getFieldInfo(this: Injectable | Def) {
  if (this.parent) {
    const fieldInfo = this.parent.typeInfo.fields.get(this.name)
    if (!fieldInfo) {
      throw new Error(`xmlNode ${this.content} is injectable but not registered on parent's typeInfo as field`)
    }

    return fieldInfo
  }
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

  ret.getDefPath = buildDefPath.bind(ret)
  ret.getFieldInfo = getFieldInfo.bind(ret)

  return ret
}

export function unInjectable(xmlNode: Injectable): XMLNode {
  const ret = xmlNode as Partial<Writable<Injectable>>

  delete ret.typeInfo
  delete ret.fields
  delete ret.isLeafNode
  delete ret.getDefPath
  delete ret.getFieldInfo

  return ret as XMLNode
}
