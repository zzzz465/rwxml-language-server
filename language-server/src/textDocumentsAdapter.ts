import EventEmitter from 'events'
import { either } from 'fp-ts'
import { inject, singleton } from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { Connection, TextDocumentChangeEvent, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import { ConnectionToken } from './connection'
import { FileStore } from './fileStore'
import defaultLogger, { withClass } from './log'

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
  private log = winston.createLogger({
    format: winston.format.combine(withClass(TextDocumentsAdapter)),
    transports: [defaultLogger()],
  })

  readonly event = new EventEmitter() as TypedEventEmitter<Events>
  readonly textDocuments = new TextDocuments(TextDocument)

  constructor(@inject(ConnectionToken) connection: Connection, private readonly fileStore: FileStore) {
    this.textDocuments.listen(connection)

    this.textDocuments.onDidOpen(this.onOpen.bind(this))
    this.textDocuments.onDidChangeContent(this.onContentChanged.bind(this))
    this.textDocuments.onDidClose(this.onDidClose.bind(this))
  }

  private onOpen(e: TextDocumentChangeEvent<TextDocument>): void {
    const res = this.fileStore.load({ uri: URI.parse(e.document.uri.toString()) })
    if (either.isLeft(res)) {
      this.log.error(`failed load file. err: ${res.left}`)
      return
    }
  }

  private onContentChanged(e: TextDocumentChangeEvent<TextDocument>): void {
    this.event.emit('textDocumentChanged', e.document)
  }

  private onDidClose(e: TextDocumentChangeEvent<TextDocument>): void {
    const err = this.fileStore.unload(e.document.uri.toString())
    if (err) {
      this.log.error(err)
    }
  }
}
