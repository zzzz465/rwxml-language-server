import { Injectable } from './injectable'
import { Writable } from '../utils/types'

export type DefNameType = string

export class Def extends Injectable {
  static toDef(injectable: Injectable): Def {
    const def = injectable as Writable<Def>

    def.reference.incoming = new Set()

    Reflect.setPrototypeOf(def, Def.prototype)

    return def
  }

  readonly reference: {
    incoming: Set<Injectable>
    outgoing: Set<Def>
  }

  private constructor() {
    super()
    throw new Error()
  }

  getDefName(): string | undefined {
    const defNameNode = this.children.find((d) => d.name == 'defName')
    if (defNameNode && defNameNode.validNode && defNameNode.content) {
      return defNameNode.content
    } else {
      return undefined
    }
  }

  getInheritName(): string | undefined {
    const inheritName = this.attributes['Name']
    return inheritName ?? undefined
  }

  override getDefPath(): string | undefined {
    const defName = this.getDefName()

    if (defName) {
      return this.name + '.' + defName
    }
  }

  getFieldInfo() {
    return undefined
  }
}
