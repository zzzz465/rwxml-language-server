import { cache, CacheScope, CacheType } from 'cache-decorator'
import { ElementType } from 'domelementtype'
import { Attribute } from '../parser/node/attribute'
import { Element } from '../parser/node/element'
import { Node, NodeWithChildren } from '../parser/node/node'
import { FieldInfo, TypeInfo } from './types'

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
      return parentDefPath + '.' + this.tagName
    }
  }

  getFieldInfo(): FieldInfo | null {
    return this.fieldInfo
  }
}

export class Def extends Element {
  readonly typeInfo: TypeInfo
  // required to implement TypedElement
  readonly fieldInfo: null = null
  readonly fields: Map<string, TypedElement>

  constructor(
    name: string,
    attribs: { [name: string]: Attribute },
    typeInfo: TypeInfo,
    parent?: NodeWithChildren,
    children?: Node[]
  ) {
    super(name, attribs, children, ElementType.Tag)

    this.typeInfo = typeInfo
    this.fields = new Map() // TODO: impl this
    this.parent = parent ?? null
  }

  getDefType(): string {
    const defType = this.typeInfo.getDefType()
    if (defType) {
      return defType
    } else {
      throw new Error(
        `node: ${this.tagName} is DefType, but typeInfo doesn't have defType. uri: ${this.document.uri}, start: ${this.nodeRange.start}, end: ${this.nodeRange.end}`
      )
    }
  }

  isLeafNode(): boolean {
    return this.children.length == 0
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getDefName(): string | undefined {
    const defNameElement = this.children.find((d: any) => (d as Element).tagName == 'defName') as Element | undefined
    return defNameElement?.content
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getNameAttributeValue(): string | undefined {
    const inheritName = this.attribs['Name']
    return inheritName?.value ?? undefined
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getParentNameAttributeValue(): string | undefined {
    const parentName = this.attribs['ParentName']
    return parentName?.value ?? undefined
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getDefPath(): string | null {
    const defName = this.getDefName()

    if (defName) {
      return this.tagName + '.' + defName
    }

    return null
  }
}
