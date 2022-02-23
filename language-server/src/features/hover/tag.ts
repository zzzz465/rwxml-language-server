import { FieldInfo, Injectable } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { MarkupKind } from 'vscode-languageserver'
import * as winston from 'winston'
import { LogToken } from '../../log'
import { genericClassNameToString, csharpFieldCodeBlock, classNameCodeBlock } from '../utils/markdown'

@tsyringe.injectable()
export class TagHoverProvider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${TagHoverProvider.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(@tsyringe.inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  onTagHover(node: Injectable, offset: number): ls.Hover | null {
    if (!this.isPointingInjectableTagName(node, offset)) {
      return null
    }

    let value = ''

    if (node.fieldInfo) {
      value = this.getFieldHoverText(node, node.fieldInfo)
    } else {
      value = classNameCodeBlock(node)
    }

    return { contents: { kind: MarkupKind.Markdown, value } }
  }

  private isPointingInjectableTagName(node: Injectable, offset: number): boolean {
    return node.openTagNameRange.include(offset) || node.closeTagNameRange.include(offset)
  }

  private getFieldHoverText(node: Injectable, fieldInfo: FieldInfo): string {
    const accessor = fieldInfo.isPublic ? 'public' : 'private'
    const type = fieldInfo.fieldType.isGeneric
      ? genericClassNameToString(fieldInfo.fieldType)
      : fieldInfo.fieldType.className

    return [csharpFieldCodeBlock(node.tagName, accessor, type)].join('  \n')
  }
}
