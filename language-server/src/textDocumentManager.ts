import { TextDocument } from 'vscode-languageserver-textdocument'

export class TextDocumentManager {
  private documents: Map<string, TextDocument> = new Map()

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
}
