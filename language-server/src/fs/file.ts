import * as path from 'path'
import { container } from 'tsyringe'
import { URI } from 'vscode-uri'
import { TextReader } from './reader'

export interface FileCreateParameters {
  uri: URI
  readonly?: boolean
  ownerPackageId?: string
}

export abstract class File {
  static create(params: FileCreateParameters): File {
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
        break

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

  readonly metadataCreated = Date.now()

  constructor(public readonly uri: URI) {}

  abstract toString(): string
}

export interface DependencyFile extends File {
  // packageId of this File's owner.
  readonly ownerPackageId: string
}

export namespace DependencyFile {
  /**
   * DependencyFile.is() checks file is dependency file
   */
  export function is(file: File): file is DependencyFile {
    return 'ownerPackageId' in file && typeof (file as any)['ownerPackageId'] === 'string'
  }
}

export class OtherFile extends File {
  constructor(uri: URI) {
    super(uri)
  }

  toString() {
    return `OtherFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

/**
 * @todo create TextFile and make XMLFile inherit it
 */
export class TextFile extends File {
  private data?: string = undefined
  private readPromise?: Promise<string> = undefined

  constructor(uri: URI, public readonly readonly?: boolean) {
    super(uri)
  }

  // TODO: add error handling
  async read(): Promise<string> {
    if (!this.data) {
      if (!this.readPromise) {
        const xmlFileReader = container.resolve(TextReader)
        this.readPromise = xmlFileReader.read(this)
      }

      this.data = await this.readPromise
    }

    return this.data
  }

  toString() {
    return `TextFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

export class XMLFile extends TextFile {
  toString() {
    return `XMLFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

export class TextureFile extends File {
  readonly readonly = true
  constructor(uri: URI) {
    super(uri)
  }

  toString() {
    return `TextureFile ${decodeURIComponent(this.uri.toString())}`
  }
}

export class AudioFile extends File {
  readonly readonly = true
  constructor(uri: URI) {
    super(uri)
  }

  toString() {
    return `Audiofile ${decodeURIComponent(this.uri.toString())}`
  }
}

export class DLLFile extends File {
  readonly readonly = true
  constructor(uri: URI) {
    super(uri)
  }

  get fsPath() {
    return this.uri.fsPath
  }

  toString() {
    return `DLLFile ${decodeURIComponent(this.uri.toString())}`
  }
}
