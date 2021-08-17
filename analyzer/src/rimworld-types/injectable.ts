import { XMLNode } from '../parser/XMLNode'
import { TypeInfo } from './typeInfo'
import { FieldInfo } from './fieldInfo'
import { Writable } from '../utils/types'
import { cache, CacheScope, CacheType } from 'cache-decorator/lib'

export class Injectable extends XMLNode {
  static toInjectable(node: XMLNode, typeInfo: TypeInfo, fieldInfo?: FieldInfo): Injectable {
    const ret = node as Writable<Injectable>

    ret.typeInfo = typeInfo
    ret.fields = new Map()

    Reflect.setPrototypeOf(ret, Injectable.prototype)

    return ret as Injectable
  }

  readonly name!: string
  readonly typeInfo!: TypeInfo
  readonly fieldInfo?: FieldInfo
  readonly fields!: Map<string, Injectable>
  readonly parent!: Injectable

  protected constructor() {
    super()
    throw new Error()
  }

  isLeafNode() {
    return this.children.length == 0
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
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
    return this.fieldInfo
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  private indexOfParent(): number {
    if (this.parent.typeInfo.isEnumerable()) {
      return this.parent.children.indexOf(this)
    } else {
      throw new Error('indexOfParent called but parent node is not enumerable.')
    }
  }
}
