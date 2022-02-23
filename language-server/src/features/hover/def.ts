import { Def, Element, Injectable } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { MarkupKind } from 'vscode-languageserver'
import * as winston from 'winston'
import { LogToken } from '../../log'
import { getClassNameCodeBlock } from '../utils/markdown'

@tsyringe.injectable()
export class DefHoverProvider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${DefHoverProvider.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(@tsyringe.inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  onDefHover(node: Def, offset: number): ls.Hover | null {
    const value = getClassNameCodeBlock(node as Element as Injectable)
    return { contents: { kind: MarkupKind.Markdown, value } }
  }
}
