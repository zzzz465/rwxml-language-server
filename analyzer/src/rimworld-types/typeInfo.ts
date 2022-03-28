import { FieldInfo } from './fieldInfo'
import { cache, CacheType, CacheScope } from 'cache-decorator'

export type SpecialType =
  | 'integer'
  | 'float'
  | 'bool'
  | 'string'
  | 'enum'
  | 'color'
  | 'intVec3'
  | 'intRange'
  | 'floatRange'

export interface TypeInfoMetadata {
  texPath?: string
}

export class TypeInfo {
  constructor(
    public readonly metadata: TypeInfoMetadata,
    public readonly fullName: string,
    public readonly namespaceName: string,
    public readonly className: string,
    public readonly attributes: Record<string, TypeInfo>, // need to populate typeInfo
    public readonly fields: Record<string, FieldInfo>, // need to populate typeInfo
    public readonly genericArguments: TypeInfo[], // need to populate typeInfo
    public readonly baseClass: TypeInfo | undefined, // need to populate typeInfo
    public readonly methods: string[],
    public readonly isGeneric: boolean,
    public readonly isArray: boolean
  ) {}

  isDerivedFrom(base: TypeInfo) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let parent: TypeInfo = this
    while (parent !== base && !!parent.baseClass) {
      parent = parent.baseClass
    }

    if (parent === base) {
      return true
    } else {
      return false
    }
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isDef(): boolean {
    if (this.fullName === 'Verse.Def') {
      return true
    } else if (this.baseClass) {
      return this.baseClass.isDef()
    } else {
      return false
    }
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isEnumerable(): boolean {
    return this.isArray || (this.isGeneric && this.fullName.match(/System\.Collections\.Generic\.List.*/) != null)
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isString() {
    return this.fullName === 'System.String'
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isInteger() {
    switch (this.fullName) {
      case 'System.Byte':
      case 'System.SByte':
      case 'System.UInt16':
      case 'System.UInt32':
      case 'System.UInt64':
      case 'System.Int16':
      case 'System.Int32':
      case 'System.Int64':
      case 'System.Decimal':
      case 'System.Double':
        return true
    }

    return false
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isFloat() {
    switch (this.fullName) {
      case 'System.Single':
      case 'System.Decimal':
      case 'System.Double':
        return true
    }

    return false
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isType() {
    switch (this.fullName) {
      case 'System.Type':
        return true
    }

    return false
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isBoolean() {
    return this.fullName === 'System.Boolean'
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isColor32() {
    return this.fullName === 'UnityEngine.Color32'
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  getDefType(): string | undefined {
    if (this.isDef()) {
      if (this.namespaceName.startsWith('Verse') || this.namespaceName.startsWith('RimWorld')) {
        return this.className
      } else {
        return this.fullName
      }
    }
  }
}
