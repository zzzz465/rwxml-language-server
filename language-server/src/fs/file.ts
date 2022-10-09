import AsyncLock from 'async-lock'
import * as path from 'path'
import { container } from 'tsyringe'
import { URI } from 'vscode-uri'
import { TextReader } from './reader'

export interface FileCreateParameters {
  uri: URI
  readonly?: boolean
  ownerPackageId?: string
}

export function isXMLFile(ext: string): boolean {
  return ext === '.xml'
}

export function isImageFile(ext: string): boolean {
  switch (ext) {
    case '.bmp':
    case '.jpeg':
    case '.jpg':
    case '.png':
      return true
  }

  return false
}

export function isSoundFile(ext: string): boolean {
  switch (ext) {
    case '.wav':
    case '.mp3':
      return true
  }

  return false
}

export function isDLLFile(ext: string): boolean {
  return ext === '.dll'
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

  private _createdAt: number = Date.now()
  private _updatedAt: number = Date.now()

  get createdAt(): number {
    return this._createdAt
  }

  get updatedAt(): number {
    return this._updatedAt
  }

  get ext(): string {
    return path.extname(this.uri.fsPath)
  }

  constructor(public readonly uri: URI) {}

  /**
   * update file to a newer state.
   * @virtual
   */
  update(): void {
    this._updatedAt = Date.now()
  }

  abstract toString(): string
}

/**
 * @deprecated
 */
export interface DependencyFile extends File {
  /**
   * packageId of this File's owner.
   * @deprecated
   */
  readonly ownerPackageId: string
}

/**
 * @deprecated
 */
export namespace DependencyFile {
  /**
   * DependencyFile.is() checks file is dependency file
   * @deprecated
   */
  export function is(file: File): file is DependencyFile {
    return 'ownerPackageId' in file && typeof (file as any)['ownerPackageId'] === 'string'
  }
}

export class OtherFile extends File {
  constructor(uri: URI) {
    super(uri)
  }

  toString(): string {
    return `OtherFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

/**
 * @todo create TextFile and make XMLFile inherit it
 */
export class TextFile extends File {
  private data?: string = undefined

  private readonly lock = new AsyncLock()

  constructor(uri: URI, public readonly readonly?: boolean) {
    super(uri)
  }

  // TODO: add error handling
  async read(): Promise<string | Error> {
    return await this.lock.acquire(this.read.name, async () => {
      if (this.data) {
        return this.data
      }

      const lastUpdatedAt = this.updatedAt

      const xmlFileReader = container.resolve(TextReader)
      const res = await xmlFileReader.read(this)
      if (res instanceof Error) {
        return res
      }

      if (lastUpdatedAt !== this.updatedAt) {
        return await this.read()
      }

      this.data = res

      return this.data
    })
  }

  update(): void {
    this.data = undefined

    super.update()
  }

  toString(): string {
    return `TextFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

export class XMLFile extends TextFile {
  toString(): string {
    return `XMLFile: ${decodeURIComponent(this.uri.toString())}`
  }
}

export class TextureFile extends File {
  readonly readonly = true
  constructor(uri: URI) {
    super(uri)
  }

  toString(): string {
    return `TextureFile ${decodeURIComponent(this.uri.toString())}`
  }
}

export class AudioFile extends File {
  readonly readonly = true
  constructor(uri: URI) {
    super(uri)
  }

  toString(): string {
    return `Audiofile ${decodeURIComponent(this.uri.toString())}`
  }
}

export class DLLFile extends File {
  readonly readonly = true
  constructor(uri: URI) {
    super(uri)
  }

  get fsPath(): string {
    return this.uri.fsPath
  }

  toString(): string {
    return `DLLFile ${decodeURIComponent(this.uri.toString())}`
  }
}
