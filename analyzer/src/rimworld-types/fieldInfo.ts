import { TypeInfo } from './typeInfo'
import { TypeIdentifier } from './declaredType'

export interface FieldInfoMetadata {}

export class FieldInfo {
  constructor(
    public readonly metadata: FieldInfoMetadata,
    public readonly declaringType: TypeInfo,
    public readonly fieldType: TypeInfo,
    public readonly attributes: Record<string, TypeIdentifier>,
    public readonly isPublic: boolean,
    public readonly isPrivate: boolean
  ) {}
}
