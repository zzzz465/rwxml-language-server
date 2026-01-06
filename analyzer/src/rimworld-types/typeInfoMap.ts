import { TypeInfo } from './typeInfo'
import { DefType, TypeIdentifier } from './declaredType'
import { isFullName } from './util'
import { cache, CacheScope, CacheType } from 'cache-decorator'

const rimworldNamespaces = [
  'Verse',
  'RimWorld',
  'Verse.AI',
  'Verse.AI.Group',
  'Verse.Noise',
  'Verse.Sound',
  'RimWorld.Planet',
  'Verse.Profile',
  'Verse.Grammar',
  'RimWorld.BaseGen',
  'RimWorld.IO',
  'RimWorld.QuestGen',
  'RimWorld.SketchGen',
]

export class TypeInfoMap {
  private typeMap: Map<TypeIdentifier, TypeInfo> = new Map()
  private classNameMap: Map<string, TypeInfo[]> = new Map()

  /** raw data used for building typeInfoMap. read-only */
  rawData: any = undefined

  addTypeInfo(typeInfo: TypeInfo): void {
    this.checkTypeAlreadyExists(typeInfo)
    this.typeMap.set(typeInfo.fullName, typeInfo)

    // index by className for fast lookup
    const lowerName = typeInfo.className.toLowerCase()
    let list = this.classNameMap.get(lowerName)
    if (!list) {
      list = []
      this.classNameMap.set(lowerName, list)
    }
    list.push(typeInfo)
  }

  addTypeInfos(...typeInfos: TypeInfo[]): void {
    for (const typeInfo of typeInfos) {
      this.addTypeInfo(typeInfo)
    }
  }

  getAllNodes(): TypeInfo[] {
    return [...this.typeMap.values()]
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  getAllCompTypes(): TypeInfo[] {
    return this.getAllNodes().filter((type) => type.className.startsWith('Comp'))
  }

  @cache({ type: CacheType.MEMO, scope: CacheScope.INSTANCE })
  getAllVerbTypes(): TypeInfo[] {
    return this.getAllNodes().filter((type) => type.className.startsWith('Verb_'))
  }

  getTypeInfoByName(name: string): TypeInfo | null {
    const primitiveMapping: Record<string, string> = {
      int: 'System.Int32',
      long: 'System.Int64',
      float: 'System.Single',
      double: 'System.Double',
      string: 'System.String',
      bool: 'System.Boolean',
      object: 'System.Object',
    }

    const searchName = primitiveMapping[name] || name

    // 1. exact match (fullName)
    const exactMatch = this.typeMap.get(searchName)
    if (exactMatch) {
      return exactMatch
    }

    // 2. lookup by className (case-insensitive)
    const lowerName = searchName.toLowerCase()
    const list = this.classNameMap.get(lowerName)
    if (list && list.length > 0) {
      return list[0]
    }

    // final fallback: if it's System.XXX, try just XXX
    if (searchName.startsWith('System.')) {
      const shortName = searchName.split('.').pop()?.toLowerCase()
      if (shortName) {
        const fallbackList = this.classNameMap.get(shortName)
        if (fallbackList && fallbackList.length > 0) {
          return fallbackList[0]
        }
      }
    }

    // Odyssey DLC fallback: handle doubled prefixes like StructureStructureLayoutDef
    if (name.startsWith('StructureStructure')) {
      const fixedName = name.substring(9) // remove one 'Structure'
      return this.getTypeInfoByName(fixedName)
    }

    return null
  }

  getTypeInfoFullName(id: TypeIdentifier): TypeInfo | undefined {
    return this.typeMap.get(id)
  }

  private checkTypeAlreadyExists(typeInfo: TypeInfo) {
    if (this.typeMap.has(typeInfo.fullName)) {
      throw new Error(`exception while adding typeInfo: type ${typeInfo.fullName} is already exists`)
    }
  }
}
