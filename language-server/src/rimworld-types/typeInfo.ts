import { Metadata } from './metadata'
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

  constructor(fullName: TypeIdentifier) {
    this.fullName = fullName
    this.childNodes = new Map()
    this.metadata = {}
  }
}
