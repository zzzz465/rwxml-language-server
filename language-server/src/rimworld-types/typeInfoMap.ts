import { TypeInfo } from './typeInfo'
import { DefType, TypeIdentifier } from './declaredType'
import { isFullName } from './util'

export class TypeInfoMap {
  private typeMap: Map<TypeIdentifier, TypeInfo> = new Map()

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

  getTypeInfoByName(id: DefType | TypeIdentifier | null | undefined): TypeInfo | undefined {
    if (!id) {
      return undefined
    }

    let typeInfo = this.typeMap.get(id)

    if (!typeInfo) {
      if (!isFullName(id)) {
        typeInfo = this.typeMap.get(`RimWorld.${id}`)
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
