import { TypeIdentifier } from './declaredType'

export interface Metadata {
  texPath?: string
  enumerable?: {
    genericType: TypeIdentifier
  }
  compClass?: {
    baseClass: TypeIdentifier
  }
  defType?: {
    name: string
  }
}
