import { Injectable } from './injectable'
import { Writable } from '../utils/types'
import { cache, CacheScope, CacheType } from 'cache-decorator'

export type DefNameType = string

export class Def extends Injectable {
  static toDef(injectable: Injectable): Def {
    const def = injectable as unknown as Writable<Def>

    Reflect.setPrototypeOf(def, Def.prototype)

    return def as Def
  }

  private constructor() {
    super()
    throw new Error()
  }

  getDefType(): string {
    const defType = this.typeInfo.getDefType()
    if (defType) {
      return defType
    } else {
      throw new Error(
        `node: ${this.name} is DefType, but typeInfo doesn't have defType. uri: ${this.document.uri}, start: ${this.elementRange.start}, end: ${this.elementRange.end}`
      )
    }
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getDefName(): string | undefined {
    const defNameNode = this.children.find((d) => d.name == 'defName')
    if (defNameNode && defNameNode.validNode && defNameNode.content) {
      return defNameNode.content
    } else {
      return undefined
    }
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getNameAttributeValue(): string | undefined {
    const inheritName = this.attributes['Name']
    return inheritName ?? undefined
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getParentNameAttributeValue(): string | undefined {
    const parentName = this.attributes['ParentName']
    return parentName ?? undefined
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
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
