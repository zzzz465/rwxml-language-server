import { IXMLNode } from './XMLNode'

export interface XMLDocument extends IXMLNode {
  readonly rawXML: string
  rawXMLDefinition: string
  uri?: string
}
