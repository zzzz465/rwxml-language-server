import { TypeIdentifier } from './declaredType'
import { FieldMetadata } from './fieldMetadata'

export interface RawFieldInfo {
  fieldMetadata: FieldMetadata
  fullName: TypeIdentifier
}
