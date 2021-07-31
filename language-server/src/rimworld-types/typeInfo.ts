import { Metadata } from './metadata'
import { cache } from '../utils/cache'
import typeMap from './specialTypeMap'
import { FieldInfo } from './fieldInfo'

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

export class TypeInfo {
  readonly metadata: Metadata = {}
  readonly fields: Map<string, FieldInfo> = new Map()

  constructor(public readonly fullName: string) {}

  @cache()
  get isDef(): boolean {
    return !!this.metadata.defType
  }

  @cache()
  get specialType(): SpecialType | undefined {
    return typeMap.get(this.fullName)
  }
}
