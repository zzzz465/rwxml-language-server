import { TypeInfo } from './typeInfo'
import { TypeIdentifier } from './declaredType'

export class TypeInfoMap {
  private typeMap: Map<TypeIdentifier, TypeInfo> = new Map()

  addTypeInfo(typeInfo: TypeInfo): void {
    throw new Error()
  }

  addTypeInfos(...typeInfos: TypeInfo[]): void {
    for (const typeInfo of typeInfos) {
      this.addTypeInfo(typeInfo)
    }
  }

  getAllNodes(): TypeInfo[] {
    return [...this.typeMap.values()]
  }
}
