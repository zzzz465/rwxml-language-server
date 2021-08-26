import rwxml from '@rwxml/analyzer'
import { TextDocuments } from 'vscode-languageserver'
import { Position, Range, TextDocument } from 'vscode-languageserver-textdocument'
import { Project } from '../project'
import { TextDocumentManager } from '../textDocumentManager'

export class RangeConverter {
  constructor(private readonly textDocumentManager: TextDocumentManager) {}

  toLanguageServerRange(range: rwxml.Range, uri: string): Range | undefined {
    if (range.start === -1 || range.end === -1) {
      return
    }

    const textDocument = this.textDocumentManager.get(uri)

    if (!textDocument) {
      return
    }

    const start = textDocument.positionAt(range.start)
    const end = textDocument.positionAt(range.end)

    return { start, end }
  }

  toRange(range: Range, uri: string): rwxml.Range | undefined {
    const textDocument = this.textDocumentManager.get(uri)

    if (!textDocument) {
      return
    }

    const start = textDocument.offsetAt(range.start)
    const end = textDocument.offsetAt(range.end)

    return { start, end }
  }

  toOffset(position: Position, uri: string): number | undefined {
    const textDocument = this.textDocumentManager.get(uri)

    if (!textDocument) {
      return
    }

    return textDocument.offsetAt(position)
  }
}
