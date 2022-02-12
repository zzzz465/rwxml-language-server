export type Resource = XMLResource

export interface XMLResource {
  type: 'xml'
  uri: string
  xml: string
}

export interface DLLResource {
  type: 'def'
  uri: string
  typeInfo: any[]
}

export interface ImageResource {
  type: 'image'
  uri: string
}
