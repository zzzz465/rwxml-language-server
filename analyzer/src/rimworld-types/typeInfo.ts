import { FieldInfo } from './fieldInfo'
import { cache, CacheType, CacheScope } from 'cache-decorator'
import { AsEnumerable } from 'linq-es2015'
import _ from 'lodash'

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
    /**
     * fields is an array of FieldInfo that this TypeInfo declares.
     */
    public readonly fields: Record<string, FieldInfo>, // need to populate typeInfo
    /**
     * genericArguments is an array of types if this TypeInfo is generic Type.
     */
    public readonly genericArguments: TypeInfo[], // need to populate typeInfo
    public readonly baseClass: TypeInfo | undefined, // need to populate typeInfo
    public readonly methods: string[],
    public readonly isGeneric: boolean,
    public readonly isArray: boolean,
    public readonly isEnum: boolean,
    public readonly enums: string[],
    /**
     * interfaces is an array of types that this typeInfo impelments.
     */
    public readonly interfaces: Record<string, TypeInfo>, // need to populate typeInfo
    public readonly isInterface: boolean
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

  /**
   * isEnumerable() retruns the Typeinfo implements IEnumerable.
   */
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isEnumerable(): boolean {
    return !!this.isImplementingInterface('System.Collections.IEnumerable')
  }

  /**
   * isDictionary() returns the TypeInfo implements IDictionary.
   */
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isDictionary(): boolean {
    return !!this.isImplementingInterface('System.Collections.IDictionary')
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

  /**
   * check this type is enum flag.
   * @see https://docs.microsoft.com/ko-kr/dotnet/api/system.flagsattribute?view=net-6.0
   */
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isEnumFlag() {
    return this.isEnum && this.attributes['FlagsAttribute']
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

  /**
   * getField returns a FieldInfo of the given name.
   * @param name name of the field
   * @param inherited search including base classes, recursively.
   */
  getField(name: string, inherited = true): FieldInfo | null {
    if (this.fields[name]) {
      return this.fields[name]
    }

    if (inherited && this.baseClass) {
      return this.baseClass.getField(name, inherited)
    }

    return null
  }

  /**
   * getFields returns all field that this TypeInfo holds.
   * @param inherited whether to include base class's fields, recursively.
   */
  getFields(inherited = true): FieldInfo[] {
    return inherited ? this._getFields() : this._getFieldsWithBase()
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  private _getFields(): FieldInfo[] {
    return _.uniqWith(Object.values(this.fields), (x, y) => x.name === y.name)
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  private _getFieldsWithBase(): FieldInfo[] {
    return AsEnumerable([...this._getFields(), ...(this.baseClass?._getFieldsWithBase() ?? [])])
      .Where((x) => x !== null)
      .Cast<FieldInfo[]>()
      .SelectMany((x) => x)
      .Distinct((x) => x.name)
      .ToArray()
  }

  getInterface(name: string, inherited = true): TypeInfo | null {
    if (this.interfaces[name]) {
      return this.interfaces[name]
    }

    if (inherited && this.baseClass) {
      return this.baseClass.getInterface(name, inherited)
    }

    return null
  }

  getInterfaces(inherited = true): TypeInfo[] {
    return inherited ? this._getInterfaces() : this._getInterfacesWthBase()
  }

  isImplementingInterface(fullName: string): boolean {
    return this.getInterfaces().some((iface) => iface.fullName === fullName)
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  private _getInterfaces(): TypeInfo[] {
    return _.uniqWith(Object.values(this.interfaces), (x, y) => x.fullName === y.fullName)
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  private _getInterfacesWthBase(): TypeInfo[] {
    return AsEnumerable([...this._getInterfaces(), ...(this.baseClass?._getInterfacesWthBase() ?? [])])
      .Where((x) => x !== null)
      .Cast<TypeInfo[]>()
      .SelectMany((x) => x)
      .Distinct((x) => x.fullName)
      .ToArray()
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  getEnumerableType(): TypeInfo | null {
    const interfaces = this.getInterfaces()

    return (
      AsEnumerable(this.getInterfaces())
        .Where((type) => type.isEnumerable())
        .FirstOrDefault() ?? null
    )
  }
}
