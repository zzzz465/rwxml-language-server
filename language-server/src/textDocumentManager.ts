import EventEmitter from 'events'
import { singleton } from 'tsyringe'
import { Connection, TextDocumentChangeEvent, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'

interface TextDocumentManagerEvents {
  onContentChange(e: TextDocumentChangeEvent<TextDocument>): void
}

@singleton()
export class TextDocumentManager {
  public readonly event: EventEmitter<TextDocumentManagerEvents> = new EventEmitter()
  private documents: Map<string, TextDocument> = new Map()
  private textDocuments = new TextDocuments(TextDocument)

  listen(connection: Connection) {
    this.textDocuments.listen(connection)

    this.textDocuments.onDidChangeContent(this.onDidChangeContent.bind(this))
  }

  get(uri: string) {
    return this.documents.get(uri)
  }

  set(uri: string, text: string, language = 'xml') {
    const document = TextDocument.create(uri, language, 0, text)
    this.documents.set(uri, document)
  }

  delete(uri: string) {
    return this.documents.delete(uri)
  }

  private onDidChangeContent(e: TextDocumentChangeEvent<TextDocument>) {
    this.event.emit('onContentChange', e)
  }
}
