import * as path from 'path'
import { container } from 'tsyringe'
import { URI } from 'vscode-uri'
import { XMLFileReader } from './reader'

export namespace File {
  export interface FileCreateParameters {
    uri: URI
    readonly?: boolean
    ownerPackageId?: string
  }
  export function create(params: FileCreateParameters) {
    const uri = params.uri

    let file: File

    const extname = path.extname(uri.fsPath)

    switch (extname) {
      case '.xml':
        file = new XMLFile(uri, params.readonly)
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

      case '.dll':
        file = new DLLFile(uri)

      default:
        file = new OtherFile(uri)
        break
    }

    if (params.ownerPackageId) {
      Object.assign<File, Pick<DependencyFile, 'ownerPackageId'>>(file, {
        ownerPackageId: params.ownerPackageId,
      })
    }

    return file
  }
}

export interface File {
  readonly uri: URI
  toString(): string
}

export interface DependencyFile extends File {
  // packageId of this File's owner.
  readonly ownerPackageId: string
}

export namespace DependencyFile {
  export function is(file: File): file is DependencyFile {
    return 'ownerPackageId' in file && typeof (file as any)['ownerPackageId'] === 'string'
  }
}

export class OtherFile implements File {
  constructor(public readonly uri: URI) {}

  toString() {
    return `OtherFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

export class XMLFile implements File {
  private data?: string = undefined

  constructor(public readonly uri: URI, public readonly readonly?: boolean) {}

  async read(): Promise<string> {
    if (!this.data) {
      const xmlFileReader = container.resolve(XMLFileReader)
      this.data = await xmlFileReader.read(this)
    }

    return this.data
  }

  toString() {
    return `XMLFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

export class TextureFile implements File {
  readonly readonly = true
  constructor(public readonly uri: URI) {}

  toString() {
    return `TextureFile ${decodeURIComponent(this.uri.toString())}`
  }
}

export class AudioFile implements File {
  readonly readonly = true
  constructor(public readonly uri: URI) {}

  toString() {
    return `Audiofile ${decodeURIComponent(this.uri.toString())}`
  }
}

export class DLLFile implements File {
  readonly readonly = true
  constructor(public readonly uri: URI) {}

  get fsPath() {
    return this.uri.fsPath
  }

  toString() {
    return `DLLFile ${decodeURIComponent(this.uri.toString())}`
  }
}
