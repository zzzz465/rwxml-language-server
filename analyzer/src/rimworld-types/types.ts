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
  ) { }

  /**
   * check if this TypeInfo treated as a special type.
   * most case is that this type have a method `LoadDataFromXmlCustom`
   */
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  customLoader(): boolean {
    return this.methods.includes('LoadDataFromXmlCustom')
  }

  /**
   * isDerivedFrom checks this type inherits base type.
   * this method returns false when base equals to self.
   */
  isDerivedFrom(base: TypeInfo) {
    if (this === base) {
      return false
    }

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

  /**
   * extends check this typeInfo extends typeName
   * unlike derivedFrom(), extends returns true when typeName equals to self.
   * @param typeName class full name to match.
   */
  extends(typeName: string): boolean {
    let current: TypeInfo | null = this

    while (current) {
      if (current.fullName === typeName) {
        return true
      }

      current = current.baseClass ?? null
    }

    return false
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
   * isListStructured() returns true if the XML list (<li> node) structured.
   * 
   * usually, `IEnumerable<T>`, `IList<T>` is the target.
   * @see getEnumerableType()
   */
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isListStructured(): boolean {
    // dictionary is also represented as list
    // isEnumerable() cannot detect non-list structured but enumerable type
    if (this.isDictionary() || this.isList() || this.isArray) {
      return true
    }

    if (this.isGeneric && this.genericArguments.length === 1) {
      const genArg0 = this.genericArguments[0]

      // why not checking with List or Array? -> check QuestNode sitePartsTags
      if (genArg0.isEnumerable()) {
        return true
      }
    }

    return false
  }

  /**
   * isMapStructured() returns true if the XML map structured.
   * 
   * usually, `IDictionary<K, V>` is the target.
   * 
   * @example
   * ```xml
   * <map> <!-- this is map structured -->
   *  <li>
   *    <key>key1</key>
   *    <value>value1</value>
   *  </li>
   *  <li>...</li>
   * </map>
   * ``` 
   */
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isMapStructured(): boolean {
    if (this.isDictionary()) {
      return true
    }

    return false
  }

  /**
   * isList() returns the TypeInfo implements IList.
   */
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isList(): boolean {
    return !!this.isImplementingInterface('System.Collections.IList')
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

  // TODO: enum should be diagnosed as numeric value, but it will break all diagnostics
  // so, we need to find a way to fix this.
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  isInteger() {
    const integerTypes = [
      'System.Byte',
      'System.SByte',
      'System.UInt16',
      'System.UInt32',
      'System.UInt64',
      'System.Int16',
      'System.Int32',
      'System.Int64',
      'System.Decimal',
      'System.Double',
    ]

    return integerTypes.includes(this.fullName)
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
  getField(name: string, inherited = true, includeAlias = true): FieldInfo | null {
    if (this.fields[name]) {
      return this.fields[name]
    }

    if (inherited && this.baseClass) {
      const field = this.baseClass.getField(name, inherited)
      if (field) {
        return field
      }
    }

    if (includeAlias) {
      const aliased = this.getFields().find((x) => x.getFieldAliasName() === name)
      if (aliased) {
        return aliased
      }
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

  /**
   * getFieldNames() returns all field name.
   * @param inherited see getFields()
   * @param includeAlias add LoadAliasAttribute names.
   */
  getFieldNames(inherited = true, includeAlias = true): string[] {
    if (!includeAlias) {
      return this.getFields(inherited).map((x) => x.name)
    }

    const fields = this.getFields(inherited)

    return fields.reduce((acc, v) => {
      acc.push(v.name)

      const alias = v.getFieldAliasName()
      if (alias) {
        acc.push(alias)
      }

      return acc
    }, [] as string[])
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

  /**
   * getEnumerableType returns T in IEnumerable<T>
   * 
   * T may also be IEnumerable<T> itself, then T will be flattened.
   * @see isListStructured()
   */
  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  getEnumerableType(): TypeInfo | null {
    // edge case: string is IEnumerable<char>
    if (this.isString()) {
      return this
    }

    // type may have nested List type. eg) List<List<T>>
    let enumerableType: TypeInfo | null = _.find(this.interfaces, (_, key) => key.startsWith('System.Collections.Generic.IEnumerable')) ?? null
    if (!enumerableType && this.fullName.startsWith('System.Collections.Generic.IEnumerable')) {
      enumerableType = this
    }

    if (enumerableType) {
      if (enumerableType.genericArguments.length !== 1) {
        // panic
        return null
      }

      return enumerableType.genericArguments[0]
    }

    // edge case: HediffDef.stages.li.statOffsets is StatModifier<IEnumerable<StatModifier>>
    // StatModifier itself is not enumerable, but inner generic is.
    if (!this.isEnumerable() && this.isGeneric) {
      if (this.genericArguments.length === 1) {
        const genArg0 = this.genericArguments[0]

        return genArg0.getEnumerableType() ?? genArg0
      }

      // unknown case
      return null
    }

    return null
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  getMapGenTypes(): [TypeInfo, TypeInfo] | null {
    // return if this is not a dictionary
    if (!this.isMapStructured()) {
      return null
    }

    // if length isn't 2, it's a special case. examine later.
    if (this.genericArguments.length !== 2) {
      return null
    }

    const k = this.genericArguments[0]
    const v = this.genericArguments[1]

    return [k, v]
  }
}
