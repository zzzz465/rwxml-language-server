import { IXMLNode, XMLNodeBase } from './XMLNode'

export interface XMLDocument extends IXMLNode {
  readonly rawXML: string
  rawXMLDefinition: string
  uri: string
}
