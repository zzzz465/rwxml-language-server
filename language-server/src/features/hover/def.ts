import { Def, Element, TypedElement } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { MarkupKind } from 'vscode-languageserver'
import * as winston from 'winston'
import defaultLogger, { withClass } from '../../log'
import { getClassNameCodeBlock } from '../utils/markdown'

@tsyringe.injectable()
export class DefHoverProvider {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(DefHoverProvider)),
    transports: [defaultLogger()],
  })

  onDefHover(node: Def, offset: number): ls.Hover | null {
    const value = getClassNameCodeBlock(node as Element as TypedElement)
    return { contents: { kind: MarkupKind.Markdown, value } }
  }
}
