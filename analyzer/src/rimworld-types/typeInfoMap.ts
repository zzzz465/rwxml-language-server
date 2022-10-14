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

  /** raw data used for building typeInfoMap. read-only */
  rawData: any = undefined

  addTypeInfo(typeInfo: TypeInfo): void {
    this.checkTypeAlreadyExists(typeInfo)
    this.typeMap.set(typeInfo.fullName, typeInfo)
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

  getTypeInfoByName(id: DefType | TypeIdentifier | null | undefined): TypeInfo | undefined {
    if (!id) {
      return undefined
    }

    let typeInfo = this.typeMap.get(id)

    if (!typeInfo) {
      if (!isFullName(id)) {
        for (const ns of rimworldNamespaces) {
          const fullName = `${ns}.${id}`
          typeInfo = this.typeMap.get(fullName)
          if (typeInfo) {
            this.typeMap.set(id, typeInfo)
            break
          }
        }
      }
    }

    return typeInfo
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
