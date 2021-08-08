import { XMLNode } from '../parser/XMLNode'
import { TypeInfo } from './typeInfo'
import { FieldInfo } from './fieldInfo'
import { Writable } from '../utils/types'

export class Injectable extends XMLNode {
  static toInjectable(node: XMLNode, typeInfo: TypeInfo): Injectable {
    const ret = node as Writable<Injectable>

    ret.typeInfo = typeInfo
    ret.fields = new Map()

    Reflect.setPrototypeOf(ret, Injectable.prototype)

    return ret
  }

  readonly name!: string
  readonly typeInfo!: TypeInfo
  readonly fields!: Map<string, Injectable>
  readonly parent!: Injectable

  protected constructor() {
    super()
    throw new Error()
  }

  isLeafNode() {
    return this.children.length == 0
  }

  getDefPath(): string | undefined {
    const parentDefPath = this.parent.getDefPath()
    if (parentDefPath) {
      if (this.parent.typeInfo.isEnumerable()) {
        // TODO: add rule which doesn't use <li> node
        const index = this.parent.children.indexOf(this)
        return parentDefPath + '.' + String(index)
      } else {
        return parentDefPath + '.' + this.name
      }
    }
  }

  getFieldInfo(): FieldInfo | undefined {
    if (this.name && this.parent) {
      const fieldInfo = this.parent.typeInfo.fields[this.name]
      if (!fieldInfo) {
        throw new Error(`xmlNode ${this.content} is injectable but not registered on parent's typeInfo as field`)
      }

      return fieldInfo
    }
  }
}
