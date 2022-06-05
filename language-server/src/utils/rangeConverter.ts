import rwxml from '@rwxml/analyzer'
import { option } from 'fp-ts'
import { pipe } from 'fp-ts/lib/function'
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

  toPosition(offset: number, uri: string): option.Option<Position> {
    return pipe(
      this.textDocumentManager.getSync(uri),
      option.fromNullable,
      option.map((doc) => doc.positionAt(offset))
    )
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
