import { XMLNode } from './XMLNode'

export interface XMLDocument extends XMLNode {
  readonly rawXML: string
  rawXMLDefinition: string
  uri: string
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function createXMLDocument(object: object | undefined, fields: Partial<XMLDocument>): XMLDocument {
  return Object.assign(XMLNode.constructor.call(object ?? Object.create(null)), fields)
}
