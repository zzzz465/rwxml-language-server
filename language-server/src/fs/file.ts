import { URI } from 'vscode-uri'

export type FileType = 'Unknown' | 'Image' | 'XML' | 'Sound'

export interface File {
  readonly type: FileType
  readonly uri: URI
}

export class XMLFile implements File {
  readonly type = 'XML'
  private text = ''

  constructor(public readonly uri: URI) {}
}
