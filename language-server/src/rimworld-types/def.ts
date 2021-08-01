import { Injectable, isInjectable, toInjectable } from './injectable'
import { XMLNode } from '../parser/XMLNode'

export interface Def extends Injectable {
  readonly inherit: {
    base: Def | null
    child: Set<Def>
  }

  readonly reference: {
    incoming: Set<Def>
    outgoing: Set<Def>
  }

  readonly defName: string
  buildDefPath(): string
  getFieldInfo(): undefined
}

function buildDefPath(this: Def) {
  return this.name + '.' + this.name
}

function getDefName(node: Injectable): string | undefined {
  const defNameNode = node.children.find((d) => d.name == 'defName')
  if (defNameNode && defNameNode.validNode) {
    return defNameNode.content
  }
}

export function isDef(obj: XMLNode | Injectable): obj is Def {
  return isInjectable(obj) && 'inherit' in obj && 'reference' in obj
}

export function toDef(obj: Injectable): Def {
  const defName = getDefName(obj)
  if (!defName) {
    throw new Error(`exception while getting defName from node: ${obj.content}`)
  }

  return Object.assign(obj, {
    inherit: { base: null, child: new Set() },
    reference: { incoming: new Set(), outgoing: new Set() },
    defName,
  }) as Def
}

export function unDef(obj: Def): Injectable {
  delete (<any>obj).inherit
  delete (<any>obj).reference
  delete (<any>obj).defName

  toInjectable(obj, obj.typeInfo)
  return obj
}
