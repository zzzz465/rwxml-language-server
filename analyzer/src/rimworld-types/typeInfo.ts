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
    public readonly attributes: Record<string, TypeInfo>, // need to populate typeInfo
    public readonly fields: Record<string, FieldInfo>, // need to populate typeInfo
    public readonly genericArguments: TypeInfo[], // need to populate typeInfo
    public readonly baseClass: TypeInfo | undefined, // need to populate typeInfo
    public readonly methods: string[],
    public readonly isGeneric: boolean,
    public readonly isArray: boolean
  ) {}

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
      case 'System.Int32':
      case 'System.Int16':
      case 'System.Int64':
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
}
