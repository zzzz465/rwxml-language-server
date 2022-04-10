import { inject, singleton } from 'tsyringe'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { File, XMLFile } from './fs'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'
import { LogToken } from './log'
import TypedEventEmitter from 'typed-emitter'

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

  constructor(@inject(LogToken) baseLogger: winston.Logger) {
    this.log = baseLogger.child({ format: this.logFormat })
  }

  listen(events: TypedEventEmitter<NotificationEvents>) {
    events.on('fileAdded', (file) => this.onFileAdded(file))
    events.on('fileChanged', (file) => this.onFileChanged(file))
    events.on('fileDeleted', (uri) => this.onFileDeleted(uri))
  }

  get(uri: string) {
    return this.documents.get(uri)
  }

  private set(uri: string, text: string, language = 'xml') {
    this.log.silly(`register document: uri: ${uri}, language: ${language}`)
    const document = TextDocument.create(uri, language, 0, text)
    this.documents.set(uri, document)
  }

  private async onFileAdded(file: File): Promise<void> {
    await this.onFileChanged(file)
  }

  private async onFileChanged(file: File): Promise<void> {
    if (file instanceof XMLFile) {
      this.log.silly(`TextFile changed, uri: ${file.uri.toString()}`)

      const data = await file.read()
      this.set(file.uri.toString(), data)
    }
  }

  private onFileDeleted(uri: string): void {
    this.documents.delete(uri)
  }
}
