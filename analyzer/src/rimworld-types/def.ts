import { TypedElement } from './typedElement'
import { Writable } from '../utils/types'
import { cache, CacheScope, CacheType } from 'cache-decorator'
import { Element } from '../parser'
import { TypeInfo } from './typeInfo'
import { FieldInfo } from './fieldInfo'

export type DefNameType = string

export class Def extends Element {
  /*
    def is actually a subset of class Injectable, but we cannot override parent as Element
    since typeof Injectable.parent is fixed to Injectable | Def
  */

  static toDef(injectable: TypedElement): Def {
    const def = injectable as unknown as Writable<Def>

    Reflect.setPrototypeOf(def, Def.prototype)

    return def as Def
  }

  getDefType(): string {
    const defType = this.typeInfo.getDefType()
    if (defType) {
      return defType
    } else {
      throw new Error(
        `node: ${this.name} is DefType, but typeInfo doesn't have defType. uri: ${this.document.uri}, start: ${this.nodeRange.start}, end: ${this.nodeRange.end}`
      )
    }
  }

  readonly name!: string
  readonly typeInfo!: TypeInfo
  readonly fieldInfo?: FieldInfo
  readonly fields!: Map<string, TypedElement>
  readonly parent!: Element

  isLeafNode() {
    return this.children.length == 0
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getDefName(): string | undefined {
    const defNameElement = this.children.find((d: any) => (d as Element).name == 'defName') as Element | undefined
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
  getDefPath(): string | undefined {
    const defName = this.getDefName()

    if (defName) {
      return this.name + '.' + defName
    }
  }

  getFieldInfo() {
    return undefined
  }
}
