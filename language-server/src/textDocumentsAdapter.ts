import EventEmitter from 'events'
import { inject, singleton } from 'tsyringe'
import { Connection, TextDocumentChangeEvent, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { ConnectionToken } from './connection'
import * as winston from 'winston'
import TypedEventEmitter from 'typed-emitter'
import { FileStore } from './fileStore'

type Events = {
  textDocumentChanged(document: TextDocument): void
}

/**
 * TextDocumentsAdapter wraps textDocuments and emits standard File events
 * @todo what happen if user didn't save edit and close?
 * @todo what happen if user read -> (modify) -> close which is not belongs to project?
 * @todo what happen if user create a file, edit, and close without saving?
 */
@singleton()
export class TextDocumentsAdapter {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${TextDocumentsAdapter.name}] ${info.message}`)
  private readonly log: winston.Logger

  readonly event = new EventEmitter() as TypedEventEmitter<Events>
  readonly textDocuments = new TextDocuments(TextDocument)

  constructor(@inject(ConnectionToken) connection: Connection, private readonly fileStore: FileStore) {
    this.log = winston.createLogger({
      transports: [new winston.transports.Console()],
      format: this.logFormat,
    })

    this.textDocuments.listen(connection)

    this.textDocuments.onDidOpen(this.onOpen.bind(this))
    this.textDocuments.onDidChangeContent(this.onContentChanged.bind(this))
    this.textDocuments.onDidClose(this.onDidClose.bind(this))
  }

  private onOpen(e: TextDocumentChangeEvent<TextDocument>): void {
    const [_, err] = this.fileStore.load({ uri: URI.parse(e.document.uri.toString()) })
    if (err) {
      this.log.error(`failed load file. err: ${err}`)
      return
    }
  }

  private onContentChanged(e: TextDocumentChangeEvent<TextDocument>) {
    this.event.emit('textDocumentChanged', e.document)
  }

  private async onDidClose(e: TextDocumentChangeEvent<TextDocument>) {
    const err = this.fileStore.unload(e.document.uri.toString())
    if (err) {
      this.log.error(err)
    }
  }
}
