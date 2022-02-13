import EventEmitter from 'events'
import { singleton } from 'tsyringe'
import { Connection, TextDocumentChangeEvent, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { File, XMLFile } from './fs'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'

/**
 * TextDocumentManager manages all textDocuments
 * it's updated by two ways
 * 1. updated by fileChanged event
 * 2. updated by textDocuments.onDidChangeContent
 * @todo add onDelete()
 */
@singleton()
export class TextDocumentManager {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${TextDocumentManager.name}] ${info.message}`)
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  private documents: Map<string, TextDocument> = new Map()
  private textDocuments = new TextDocuments(TextDocument)

  listen(connection: Connection, events: EventEmitter<NotificationEvents>) {
    this.textDocuments.listen(connection)

    events.on('fileAdded', this.onFileAdded.bind(this))
    events.on('fileChanged', this.onFileChanged.bind(this))
    this.textDocuments.onDidChangeContent(this.onDidChangeContent.bind(this))
  }

  get(uri: string) {
    return this.documents.get(uri)
  }

  private set(uri: string, text: string, language = 'xml') {
    this.log.debug(`set document, uri: ${uri}, language: ${language}`)
    const document = TextDocument.create(uri, language, 0, text)
    this.documents.set(uri, document)
  }

  private delete(uri: string) {
    return this.documents.delete(uri)
  }

  private async onFileAdded(file: File) {
    await this.onFileChanged(file)
  }

  private async onFileChanged(file: File) {
    if (file instanceof XMLFile) {
      this.log.debug(`TextFile changed, uri: ${file.uri.toString()}`)

      const data = await file.read()
      this.set(file.uri.toString(), data)
    }
  }

  private onDidChangeContent(e: TextDocumentChangeEvent<TextDocument>) {
    this.log.debug(`textDocument content changed, uri: ${e.document.uri.toString()}`)
    this.set(e.document.uri.toString(), e.document.getText(), e.document.languageId)
  }
}
