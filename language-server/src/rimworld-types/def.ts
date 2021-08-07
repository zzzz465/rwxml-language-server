import { Injectable, isInjectable, toInjectable } from './injectable'
import { XMLNode } from '../parser/XMLNode'
import { Writable } from '../utils/types'

export interface Def extends Injectable {
  readonly inherit: {
    base: Def | null
    child: Set<Def>
  }

  readonly reference: {
    incoming: Set<Def>
    outgoing: Set<Def>
  }

  getDefName(): string | undefined
  getObjectRefName(): string | undefined
  getDefPath(): string
  getFieldInfo(): undefined
}

function buildDefPath(this: Def) {
  return this.name + '.' + this.name
}

function getDefName(this: Def): string | undefined {
  const defNameNode = this.children.find((d) => d.name == 'defName')
  if (defNameNode && defNameNode.validNode) {
    return defNameNode.content
  } else {
    return undefined
  }
}

function getObjectRefName(this: Def): string | undefined {
  return this.attributes['Name'] ?? undefined
}

export function isDef(obj: XMLNode | Injectable): obj is Def {
  return isInjectable(obj) && 'inherit' in obj && 'reference' in obj
}

export function toDef(obj: Injectable): Def {
  const ret = Object.assign(obj, {
    inherit: { base: null, child: new Set() },
    reference: { incoming: new Set(), outgoing: new Set() },
  }) as Def

  ret.getDefPath = buildDefPath.bind(ret)
  ret.getDefName = getDefName.bind(ret)
  ret.getObjectRefName = getObjectRefName.bind(ret)
  ret.getFieldInfo = function () {
    return undefined
  }.bind(ret)

  return ret
}

export function unDef(def: Def): Injectable {
  const obj = def as Partial<Writable<Def>>
  delete obj.inherit
  delete obj.reference
  delete obj.getDefName
  delete obj.getDefName
  delete obj.getObjectRefName

  const ret = <Injectable>obj

  toInjectable(ret, ret.typeInfo)
  return ret
}
