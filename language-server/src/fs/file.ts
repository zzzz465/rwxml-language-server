import { URI } from 'vscode-uri'

export type File = XMLFile

export interface IFile {
  readonly uri: URI
}

export class OtherFile implements IFile {
  constructor(public readonly uri: URI) {}
}

export class XMLFile implements IFile {
  constructor(public readonly uri: URI, public readonly text: string) {}
}
