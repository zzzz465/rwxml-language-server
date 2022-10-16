import { cache, CacheScope, CacheType } from 'cache-decorator'
import { ElementType } from 'domelementtype'
import { Attribute, Element, Node, NodeWithChildren } from '../parser'
import { FieldInfo } from './fieldInfo'
import { TypedElement } from './typedElement'
import { TypeInfo } from './typeInfo'

export type DefNameType = string

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
