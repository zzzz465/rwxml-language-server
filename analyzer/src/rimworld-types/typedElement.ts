import { cache, CacheScope, CacheType } from 'cache-decorator'
import { Attribute } from '../parser/domhandler/attribute'
import { Element } from '../parser/domhandler/element'
import { Node } from '../parser/domhandler/node'
import { Def } from './def'
import { FieldInfo } from './fieldInfo'
import { TypeInfo } from './typeInfo'

export class TypedElement extends Element {
  readonly typeInfo: TypeInfo
  readonly fieldInfo: FieldInfo | null
  readonly fields: Map<string, TypedElement>
  readonly parent: TypedElement | Def

  constructor(
    name: string,
    attribs: { [name: string]: Attribute },
    parent: Def | TypedElement,
    typeInfo: TypeInfo,
    fieldInfo?: FieldInfo,
    children?: Node[]
  ) {
    super(name, attribs, children)

    this.typeInfo = typeInfo
    this.fieldInfo = fieldInfo ?? null
    this.fields = new Map() // TODO: impl this
    this.parent = parent
  }

  /**
   * checks if this node contains ChildElementNodes or not.
   */
  isLeafNode(): boolean {
    return this.ChildElementNodes.length === 0
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getDefPath(): string {
    const parentDefPath = this.parent.getDefPath()
    if (this.parent.typeInfo.isList()) {
      // TODO: add rule which doesn't use <li> node
      const index = this.parent.childNodes.indexOf(this)
      return parentDefPath + '.' + String(index)
    } else {
      return parentDefPath + '.' + this.name
    }
  }

  getFieldInfo(): FieldInfo | null {
    return this.fieldInfo
  }
}
