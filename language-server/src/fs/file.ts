import * as path from 'path'
import { URI } from 'vscode-uri'

export type File = XMLFile | OtherFile

export namespace File {
  interface FileCreateParameters {
    uri: URI
    text?: string
    readonly?: boolean
  }
  export function create(params: FileCreateParameters) {
    const uri = params.uri

    if (path.extname(uri.fsPath) === '.xml') {
      return new XMLFile(uri, params.text ?? '', params.readonly)
    }

    return new OtherFile(uri)
  }
}

export interface IFile {
  readonly uri: URI
}

export class OtherFile implements IFile {
  constructor(public readonly uri: URI) {}
}

export class XMLFile implements IFile {
  constructor(public readonly uri: URI, public readonly text: string, public readonly readonly?: boolean) {}
}
