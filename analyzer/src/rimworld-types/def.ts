import { Injectable } from './injectable'
import { Writable } from '../utils/types'
import { cache, CacheScope, CacheType } from 'cache-decorator'
import { Element } from '../parser'

export type DefNameType = string

export class Def extends Injectable {
  static toDef(injectable: Injectable): Def {
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

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getDefName(): string | undefined {
    const defNameElement = this.children.find((d: any) => (d as Element).name == 'defName') as Element | undefined
    return defNameElement?.content
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getNameAttributeValue(): string | undefined {
    const inheritName = this.attribs['Name']
    return inheritName?.name ?? undefined
  }

  @cache({ scope: CacheScope.INSTANCE, type: CacheType.MEMO })
  getParentNameAttributeValue(): string | undefined {
    const parentName = this.attribs['ParentName']
    return parentName?.name ?? undefined
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
