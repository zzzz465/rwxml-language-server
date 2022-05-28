import EventEmitter from 'events'
import ono from 'ono'
import * as tsyringe from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as winston from 'winston'
import { FileStore } from './fileStore'
import { File, TextFile } from './fs'
import defaultLogger, { className, logFormat } from './log'
import { NotificationEvents } from './notificationEventManager'
import { TextDocumentsAdapter } from './textDocumentsAdapter'
import { Result } from './types/functional'

type Events = {
  textDocumentChanged(document: TextDocument): void
}

/**
 * TextDocumentManager manages all textDocuments
 * it's updated by two ways
 * 1. updated by fileChanged event
 * 2. updated by textDocuments.onDidChangeContent
 */
@tsyringe.singleton()
export class TextDocumentManager {
  private log = winston.createLogger({
    format: winston.format.combine(className(TextDocumentManager), logFormat),
    transports: [defaultLogger()],
  })

  private documents: Map<string, TextDocument> = new Map()

  readonly event = new EventEmitter() as TypedEventEmitter<Events>

  constructor(private readonly fileStore: FileStore, textDocumentAdapter: TextDocumentsAdapter) {
    textDocumentAdapter.event.on('textDocumentChanged', (doc) => this.onTextDocumentChanged(doc))
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

  getSync(uri: string): TextDocument | null {
    return this.documents.get(uri) ?? null
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

  private onTextDocumentChanged(doc: TextDocument): void {
    if (!this.has(doc.uri)) {
      this.log.error(ono(`document is not registered. uri: ${doc.uri}`))
      return
    }

    const doc2 = this.set(doc.uri, doc.getText(), Date.now())

    this.event.emit('textDocumentChanged', doc2)
  }
}
