import { Injectable } from './injectable'
import { Writable } from '../utils/types'

export class Def extends Injectable {
  static toDef(injectable: Injectable): Def {
    const def = injectable as Writable<Def>

    def.inherit = {
      child: new Set(),
    }
    def.reference = {
      incoming: new Set(),
      outgoing: new Set(),
    }

    Reflect.setPrototypeOf(def, Def.prototype)

    return def
  }

  readonly inherit: {
    base?: Def
    child: Set<Def>
  }

  readonly reference: {
    incoming: Set<Def>
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
