import { Injectable, isInjectable } from './injectable'
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
}

export function isDef(obj: XMLNode | Injectable): obj is Def {
  return isInjectable(obj) && 'inherit' in obj && 'reference' in obj
}

export function toDef(obj: Injectable): Def {
  return Object.assign(obj, {
    inherit: { base: null, child: new Set() },
    reference: { incoming: new Set(), outgoing: new Set() },
  }) as Def
}

export function unDef(obj: Def): Injectable {
  delete (<any>obj).inherit
  delete (<any>obj).reference
  return obj
}
