import rwxml from 'rwxml-analyzer'
import { TextDocuments } from 'vscode-languageserver'
import { Range, TextDocument } from 'vscode-languageserver-textdocument'

export class RangeConverter {
  constructor(private readonly textDocuments: TextDocuments<TextDocument>) {}

  toLanguageServerRange(range: rwxml.Range, uri: string): Range | undefined {
    const textDocument = this.textDocuments.get(uri)

    if (!textDocument) {
      return
    }

    const start = textDocument.positionAt(range.start)
    const end = textDocument.positionAt(range.end)

    return { start, end }
  }
}
