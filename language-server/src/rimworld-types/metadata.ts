import { TypeIdentifier } from './declaredType'

export interface Metadata {
  enumerable?: {
    genericType: TypeIdentifier
  }
  compClass?: {
    baseClass: TypeIdentifier
  }
  defType?: {
    name: string
  }
  texPath?: string
}
