import { TypeIdentifier } from './declaredType'

export interface Metadata {
  compClass?: {
    baseClass: TypeIdentifier
  }
  defType?: {
    name: string
  }
  generic?: {
    args: {
      fullName: TypeIdentifier
    }[]
  }
  texPath?: string
}
