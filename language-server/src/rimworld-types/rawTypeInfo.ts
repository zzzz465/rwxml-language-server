import { FieldName, TypeIdentifier } from './declaredType'
import { Metadata } from './metadata'
import { RawFieldInfo } from './rawFieldInfo'

export interface RawTypeInfo {
  fullName: TypeIdentifier
  metadata: Metadata
  fields: Record<FieldName, RawFieldInfo>
}
