import { TypeInfo } from './typeInfo'
import { FieldMetadata } from './fieldMetadata'

export class FieldInfo {
  constructor(readonly fieldMetadata: FieldMetadata, readonly typeInfo: TypeInfo) {}
}
