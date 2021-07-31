import { Metadata } from './metadata'
import { cache } from '../utils/cache'
import typeMap from './specialTypeMap'

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
  readonly fullName: string
  readonly metadata: Metadata
  readonly childNodes: Map<string, TypeInfo>

  private constructor() {
    throw new Error('constructor should not be called')
  }

  @cache()
  get isDef(): boolean {
    return !!this.metadata.defType
  }

  @cache()
  get specialType(): SpecialType | undefined {
    return typeMap.get(this.fullName)
  }
}
