import EventEmitter from 'events'
import { inject, singleton } from 'tsyringe'
import { Connection, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { ConnectionToken } from './connection'
import { XMLFile } from './fs'

interface Events {
  fileAdded(file: XMLFile): void
  fileChanged(file: XMLFile): void
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
  readonly event: EventEmitter<Events> = new EventEmitter()
  readonly textDocuments = new TextDocuments(TextDocument)

  constructor(@inject(ConnectionToken) private readonly connection: Connection) {
    this.textDocuments.listen(connection)

    this.textDocuments.onDidOpen(this.onOpen.bind(this))
    this.textDocuments.onDidChangeContent(this.onContentChanged.bind(this))
    this.textDocuments.onDidClose(this.onDidClose.bind(this))
  }

  private onOpen() {
    throw new Error('onOpen not implemented')
  }

  private onContentChanged() {
    throw new Error('onContentChanged not implemented')
  }

  private onDidClose() {
    throw new Error('onDidClose not implemented')
  }
}
