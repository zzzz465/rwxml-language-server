import { ValidXMLNode, XMLNode } from '../parser/XMLNode'
import { TypeInfo } from './typeInfo'
import { FieldInfo } from './fieldInfo'
import { Def, isDef } from './def'
import { Writable } from '../utils/types'
import assert from 'assert'

export interface Injectable extends ValidXMLNode {
  readonly typeInfo: TypeInfo
  readonly fields: Map<string, Injectable>
  readonly parent: Injectable

  isLeafNode(): boolean
  getDefPath(): string
  getFieldInfo(): FieldInfo | undefined
}

function buildDefPath(this: Injectable) {
  if (isDef(this)) {
    return this.name + '.' + this.getDefName()
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

function isLeafNode(this: Injectable | Def): boolean {
  return this.children.length == 0
}

const checkFields = ['typeInfo', 'fields', 'parent', 'isLeafNode', 'getDefPath', 'getFieldInfo']
export function isInjectable(xmlNode: XMLNode): xmlNode is Injectable {
  for (const field of checkFields) {
    if (!(field in xmlNode)) {
      return false
    }
  }

  return true
}

export function toInjectable(xmlNode: XMLNode, typeInfo: TypeInfo): Injectable {
  assert(
    typeInfo !== undefined,
    `typeInfo for xmlNode ${xmlNode.name} is undefined or null, uri: ${xmlNode.document.uri}`
  )

  const obj = xmlNode as Writable<Injectable>

  obj.typeInfo = typeInfo
  obj.fields = new Map()
  for (const child of obj.children) {
    const fieldName = child.name
    if (fieldName && isInjectable(child)) {
      obj.fields.set(fieldName, child)
    }
  }

  obj.isLeafNode = isLeafNode.bind(obj)
  obj.getDefPath = buildDefPath.bind(obj)
  obj.getFieldInfo = getFieldInfo.bind(obj)

  return obj
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
