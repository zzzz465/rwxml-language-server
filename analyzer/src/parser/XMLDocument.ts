import { XMLNode } from './XMLNode'

export interface XMLDocument extends XMLNode {
  readonly rawXML: string
  rawXMLDefinition: string
  uri?: string
}
