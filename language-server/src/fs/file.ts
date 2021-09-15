import * as path from 'path'
import { URI } from 'vscode-uri'

export type File = XMLFile | OtherFile

export namespace File {
  export interface FileCreateParameters {
    uri: URI
    text?: string
    readonly?: boolean
    ownerPackageId?: string
  }
  export function create(params: FileCreateParameters) {
    const uri = params.uri

    let file: File

    const extname = path.extname(uri.fsPath)

    switch (extname) {
      case '.xml':
        file = new XMLFile(uri, params.text ?? '', params.readonly)
        break

      case '.wav':
      case '.mp3':
        file = new AudioFile(uri)
        break

      case '.bmp':
      case '.jpeg':
      case '.jpg':
      case '.png':
        file = new TextureFile(uri)
        break

      default:
        file = new OtherFile(uri)
        break
    }

    if (params.ownerPackageId) {
      Object.assign(file, { ownerPackageId: params.ownerPackageId })
    }

    return file
  }
}

export interface IFile {
  readonly uri: URI
  toString(): string
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

  toString() {
    return `OtherFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

export class XMLFile implements IFile {
  constructor(public readonly uri: URI, public readonly text: string, public readonly readonly?: boolean) {}

  toString() {
    return `XMLFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

export class TextureFile implements IFile {
  readonly readonly = true
  constructor(public readonly uri: URI) {}

  toString() {
    return `TextureFile ${decodeURIComponent(this.uri.toString())}`
  }
}

export class AudioFile implements IFile {
  readonly readonly = true
  constructor(public readonly uri: URI) {}

  toString() {
    return `Audiofile ${decodeURIComponent(this.uri.toString())}`
  }
}
