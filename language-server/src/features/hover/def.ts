import { Def, Element, Injectable } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { MarkupKind } from 'vscode-languageserver'
import * as winston from 'winston'
import { getClassNameCodeBlock } from '../utils/markdown'

@tsyringe.injectable()
export class DefHoverProvider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${DefHoverProvider.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor() {
    this.log = winston.createLogger({
      transports: [new winston.transports.Console()],
      format: this.logFormat,
    })
  }

  onDefHover(node: Def, offset: number): ls.Hover | null {
    const value = getClassNameCodeBlock(node as Element as Injectable)
    return { contents: { kind: MarkupKind.Markdown, value } }
  }
}
