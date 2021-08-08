import { cache } from '../utils/cache'
import { FieldInfo } from './fieldInfo'
import { TypeIdentifier } from './declaredType'

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
    public readonly attributes: Record<string, TypeIdentifier>,
    public readonly fields: Record<string, FieldInfo>,
    public readonly GenericArguments: TypeIdentifier[],
    public readonly baseClass: TypeInfo | undefined,
    public readonly isGeneric: boolean,
    public readonly isArray: boolean
  ) {}

  @cache()
  isDef(): boolean {
    if (this.fullName === 'Verse.Def') {
      return true
    } else if (this.baseClass) {
      return this.baseClass.isDef()
    } else {
      return false
    }
  }
}
