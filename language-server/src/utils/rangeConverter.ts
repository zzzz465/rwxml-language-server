import rwxml from '@rwxml/analyzer'
import { injectable } from 'tsyringe'
import { Position, Range } from 'vscode-languageserver-textdocument'
import { TextDocumentManager } from '../textDocumentManager'

@injectable()
export class RangeConverter {
  constructor(private readonly textDocumentManager: TextDocumentManager) {}

  toLanguageServerRange(range: rwxml.Range, uri: string): Range | undefined {
    if (range.start === -1 || range.end === -1) {
      return
    }

    const textDocument = this.textDocumentManager.getSync(uri)

    if (!textDocument) {
      return
    }

    const start = textDocument.positionAt(range.start)
    const end = textDocument.positionAt(range.end)

    return { start, end }
  }

  toRange(range: Range, uri: string): rwxml.Range | undefined {
    const textDocument = this.textDocumentManager.getSync(uri)

    if (!textDocument) {
      return
    }

    const start = textDocument.offsetAt(range.start)
    const end = textDocument.offsetAt(range.end)

    return new rwxml.Range(start, end)
  }

  toOffset(position: Position, uri: string): number | undefined {
    const textDocument = this.textDocumentManager.getSync(uri)

    if (!textDocument) {
      return
    }

    return textDocument.offsetAt(position)
  }
}
