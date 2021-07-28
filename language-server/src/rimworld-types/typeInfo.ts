import { Metadata } from './metadata'

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

  get isDef(): boolean {
    throw new Error()
  }

  get specialType(): SpecialType | null {
    throw new Error()
  }

  private constructor() {
    throw new Error('constructor should not be called')
  }
}
