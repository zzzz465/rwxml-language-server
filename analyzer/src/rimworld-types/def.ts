import { Injectable } from './injectable'
import { Writable } from '../utils/types'

export type DefNameType = string

export class Def extends Injectable {
  static toDef(injectable: Injectable): Def {
    const def = injectable as Writable<Def>

    def.inherit = {
      child: new Set<DefNameType>(),
    }
    def.reference = {
      incoming: new Set<DefNameType>(),
      outgoing: new Set<DefNameType>(),
    }

    Reflect.setPrototypeOf(def, Def.prototype)

    return def
  }

  readonly inherit: {
    base?: DefNameType
    child: Set<DefNameType>
  }

  readonly reference: {
    incoming: Set<DefNameType>
    outgoing: Set<DefNameType>
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
