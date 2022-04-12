import { inject, singleton } from 'tsyringe'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { File, TextFile, XMLFile } from './fs'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'
import { LogToken } from './log'
import TypedEventEmitter from 'typed-emitter'
import { FileStore } from './fileStore'
import { Result } from './types/functional'
import ono from 'ono'

/**
 * TextDocumentManager manages all textDocuments
 * it's updated by two ways
 * 1. updated by fileChanged event
 * 2. updated by textDocuments.onDidChangeContent
 */
@singleton()
export class TextDocumentManager {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${TextDocumentManager.name}] ${info.message}`)
  private readonly log: winston.Logger

  private documents: Map<string, TextDocument> = new Map()

  constructor(@inject(LogToken) baseLogger: winston.Logger, private readonly fileStore: FileStore) {
    this.log = baseLogger.child({ format: this.logFormat })
  }

  listen(events: TypedEventEmitter<NotificationEvents>) {
    events.on('fileAdded', (file) => this.onFileAdded(file))
    events.on('fileChanged', (file) => this.onFileChanged(file))
    events.on('fileDeleted', (uri) => this.onFileDeleted(uri))
  }

  has(uri: string): boolean {
    return this.documents.has(uri)
  }

  async get(uri: string): Promise<Result<TextDocument, Error>> {
    const [updateRequired, err0] = this.isUpdateRequired(uri)
    if (err0) {
      return [null, err0]
    }

    if (updateRequired) {
      await this.updateDocument(uri)
    }

    const doc = this.documents.get(uri)
    if (!doc) {
      return [null, ono(`document not registered. uri: ${uri}`)]
    }

    return [doc, null]
  }

  async getText(uri: string): Promise<Result<string, Error>> {
    const [doc, err] = await this.get(uri)
    if (err) {
      return [null, err]
    }

    return [doc?.getText(), null]
  }

  private isUpdateRequired(uri: string): Result<boolean, Error> {
    const document = this.documents.get(uri)
    if (!document) {
      return [null, ono(`document not registered. uri: ${uri}`)]
    }

    const file = this.fileStore.get(uri)
    if (!file) {
      return [null, ono(`file not exists. uri: ${uri}`)]
    }

    return [document.version < file.updatedAt, null]
  }

  private set(uri: string, text: string, timestamp: number, language = 'xml'): TextDocument {
    const document = TextDocument.create(uri, language, timestamp, text)
    this.documents.set(uri, document)

    return document
  }

  private async updateDocument(uri: string): Promise<Result<string, Error>> {
    const file = this.fileStore.get(uri)
    if (!file) {
      return [null, ono(`file not exists. uri: ${file}`)]
    } else if (!(file instanceof TextFile)) {
      return [null, ono(`file is not text file. uri: ${uri}`)]
    }

    let doc = this.documents.get(uri)
    if (!doc) {
      return [null, ono(`document is not registered. uri: ${uri}`)]
    }

    const data = await file.read()
    if (doc.version < file.updatedAt) {
      doc = this.set(uri, data, file.updatedAt)
    }

    return [doc.getText(), null]
  }

  private async onFileAdded(file: File): Promise<void> {
    if (file instanceof TextFile) {
      this.set(file.uri.toString(), '', -1)
    }
  }

  private async onFileChanged(file: File): Promise<void> {
    // NOOP
  }

  private onFileDeleted(uri: string): void {
    this.documents.delete(uri)
  }
}
