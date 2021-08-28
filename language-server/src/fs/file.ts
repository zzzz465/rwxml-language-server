import * as path from 'path'
import { URI } from 'vscode-uri'

export type File = XMLFile | OtherFile

export namespace File {
  interface FileCreateParameters {
    uri: URI
    text?: string
    readonly?: boolean
    ownerPackageId?: string
  }
  export function create(params: FileCreateParameters) {
    const uri = params.uri

    let file: File

    if (path.extname(uri.fsPath) === '.xml') {
      file = new XMLFile(uri, params.text ?? '', params.readonly)
    } else {
      file = new OtherFile(uri)
    }

    if (params.ownerPackageId) {
      Object.assign(file, { ownerPackageId: params.ownerPackageId })
    }

    return file
  }
}

export interface IFile {
  readonly uri: URI
}

export interface DependencyFile {
  // packageId of this File's owner.
  readonly ownerPackageId: string
}

export namespace DependencyFile {
  export function is(file: File): file is File & DependencyFile {
    return 'ownerPackageId' in file && typeof file['ownerPackageId'] === 'string'
  }
}

export class OtherFile implements IFile {
  constructor(public readonly uri: URI) {}
}

export class XMLFile implements IFile {
  constructor(public readonly uri: URI, public readonly text: string, public readonly readonly?: boolean) {}
}
