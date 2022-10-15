import { TypeInfo } from './typeInfo'
import { FieldInfo } from './fieldInfo'
import { Writable } from '../utils/types'
import { cache, CacheScope, CacheType } from 'cache-decorator'
import { Element } from '../parser'
import { Def } from './def'

export class TypedElement extends Element {
  static toInjectable(node: Element, typeInfo: TypeInfo, fieldInfo?: FieldInfo): TypedElement {
    const ret = node as Writable<TypedElement>

    ret.typeInfo = typeInfo
    ret.fields = new Map()
    ret.fieldInfo = fieldInfo

    Reflect.setPrototypeOf(ret, TypedElement.prototype)

    return ret as TypedElement
  }

  readonly name!: string
  readonly typeInfo!: TypeInfo
  readonly fieldInfo?: FieldInfo
  readonly fields!: Map<string, TypedElement>
  readonly parent!: TypedElement | Def

  /**
   * checks if this node contains ChildElementNodes or not.
   */
  isLeafNode() {
    return this.ChildElementNodes.length === 0
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getDefPath(): string | undefined {
    const parentDefPath = this.parent.getDefPath()
    if (parentDefPath) {
      if (this.parent.typeInfo.isList()) {
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
}
