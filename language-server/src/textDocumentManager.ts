import EventEmitter from 'events'
import { either } from 'fp-ts'
import { pipe } from 'fp-ts/lib/function'
import ono from 'ono'
import * as tsyringe from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { TextDocument } from 'vscode-languageserver-textdocument'
import * as winston from 'winston'
import { FileStore } from './fileStore'
import { File, TextFile } from './fs'
import defaultLogger, { withClass } from './log'
import { NotificationEvents } from './notificationEventManager'
import { TextDocumentsAdapter } from './textDocumentsAdapter'
import { Result } from './utils/functional/result'

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
    format: winston.format.combine(withClass(TextDocumentManager)),
    transports: [defaultLogger()],
  })

  private documents: Map<string, TextDocument> = new Map()

  readonly event = new EventEmitter() as TypedEventEmitter<Events>

  constructor(private readonly fileStore: FileStore, textDocumentAdapter: TextDocumentsAdapter) {
    textDocumentAdapter.event.on('textDocumentChanged', (doc) => this.onTextDocumentChanged(doc))
  }

  listen(events: TypedEventEmitter<NotificationEvents>): void {
    events.on('fileAdded', (file) => this.onFileAdded(file))
    events.on('fileChanged', (file) => this.onFileChanged(file))
    events.on('fileDeleted', (uri) => this.onFileDeleted(uri))
  }

  has(uri: string): boolean {
    return this.documents.has(uri)
  }

  async get(uri: string): Promise<Result<TextDocument>> {
    const res0 = this.isUpdateRequired(uri)
    if (either.isLeft(res0)) {
      return res0
    }

    const updateRequired = res0.right

    if (updateRequired) {
      await this.updateDocument(uri)
    }

    const doc = this.documents.get(uri)
    if (!doc) {
      return either.left(ono(`document not registered. uri: ${uri}`))
    }

    return either.right(doc)
  }

  getSync(uri: string): TextDocument | null {
    return this.documents.get(uri) ?? null
  }

  async getText(uri: string): Promise<Result<string>> {
    return pipe(
      await this.get(uri),
      either.map((doc) => doc.getText())
    )
  }

  private isUpdateRequired(uri: string): Result<boolean, Error> {
    const document = this.documents.get(uri)
    if (!document) {
      return either.left(ono(`document not registered. uri: ${uri}`))
    }

    const file = this.fileStore.get(uri)
    if (!file) {
      return either.left(ono(`file not exists. uri: ${uri}`))
    }

    return either.right(document.version < file.updatedAt)
  }

  private set(uri: string, text: string, timestamp: number, language = 'xml'): TextDocument {
    const document = TextDocument.create(uri, language, timestamp, text)
    this.documents.set(uri, document)

    return document
  }

  private async updateDocument(uri: string): Promise<Result<string, Error>> {
    const file = this.fileStore.get(uri)
    if (!file) {
      return either.left(ono(`file not exists. uri: ${file}`))
    } else if (!(file instanceof TextFile)) {
      return either.left(ono(`file is not text file. uri: ${uri}`))
    }

    let doc = this.documents.get(uri)
    if (!doc) {
      return either.left(ono(`document is not registered. uri: ${uri}`))
    }

    const data = await file.read()
    if (data instanceof Error) {
      return either.left(data)
    }

    if (doc.version < file.updatedAt) {
      doc = this.set(uri, data, file.updatedAt)
    }

    return either.right(doc.getText())
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
