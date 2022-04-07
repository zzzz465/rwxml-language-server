import EventEmitter from 'events'
import { inject, singleton } from 'tsyringe'
import { Connection, TextDocumentChangeEvent, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { ConnectionToken } from './connection'
import { ResourceExistsRequest } from './events'
import { File, TextFile } from './fs'
import * as winston from 'winston'
import { LogToken } from './log'
import TypedEventEmitter from 'typed-emitter'

type Events = {
  fileAdded(file: TextFile): void
  fileChanged(file: TextFile): void
  fileDeleted(uri: string): void
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

  constructor(
    @inject(ConnectionToken) private readonly connection: Connection,
    @inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })

    this.textDocuments.listen(connection)

    this.textDocuments.onDidOpen(this.onOpen.bind(this))
    this.textDocuments.onDidChangeContent(this.onContentChanged.bind(this))
    this.textDocuments.onDidClose(this.onDidClose.bind(this))
  }

  private onOpen(e: TextDocumentChangeEvent<TextDocument>) {
    const file = File.create({ uri: URI.parse(e.document.uri) })
    if (file instanceof TextFile) {
      Object.assign(file, { data: e.document.getText() })
      this.event.emit('fileAdded', file)
    }
  }

  private onContentChanged(e: TextDocumentChangeEvent<TextDocument>) {
    const file = File.create({ uri: URI.parse(e.document.uri) })
    if (file instanceof TextFile) {
      Object.assign(file, { data: e.document.getText() })
      this.event.emit('fileChanged', file)
    }
  }

  private async onDidClose(e: TextDocumentChangeEvent<TextDocument>) {
    const res = await this.connection.sendRequest(ResourceExistsRequest, { uri: e.document.uri }, undefined)
    if (res.error) {
      this.log.error(`failed to check resource exists, resource: ${JSON.stringify(res, null, 2)}`)
      return
    }
  }
}
