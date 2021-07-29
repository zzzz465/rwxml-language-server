import { TypeInfo } from './typeInfo'
import { TypeIdentifier } from './declaredType'

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

  getNodeByName(id: TypeIdentifier): TypeInfo | undefined {
    return this.typeMap.get(id)
  }

  private checkTypeAlreadyExists(typeInfo: TypeInfo) {
    if (this.typeMap.has(typeInfo.fullName)) {
      throw new Error(`exception while adding typeInfo: type ${typeInfo.fullName} is already exists`)
    }
  }
}
