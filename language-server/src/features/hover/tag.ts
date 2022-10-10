import { FieldInfo, Injectable } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { MarkupKind } from 'vscode-languageserver'
import * as winston from 'winston'
import defaultLogger, { withClass } from '../../log'
import { getClassNameCodeBlock, getCsharpFieldCodeBlock, getGenericClassNameToString } from '../utils/markdown'

@tsyringe.injectable()
export class TagHoverProvider {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(TagHoverProvider)),
    transports: [defaultLogger()],
  })

  onTagHover(node: Injectable, offset: number): ls.Hover | null {
    if (!this.isPointingInjectableTagName(node, offset)) {
      return null
    }

    let value = ''

    if (node.fieldInfo) {
      value = this.getFieldHoverText(node, node.fieldInfo)
    } else {
      value = getClassNameCodeBlock(node)
    }

    return { contents: { kind: MarkupKind.Markdown, value } }
  }

  private isPointingInjectableTagName(node: Injectable, offset: number): boolean {
    return node.openTagNameRange.include(offset) || node.closeTagNameRange.include(offset)
  }

  private getFieldHoverText(node: Injectable, fieldInfo: FieldInfo): string {
    const accessor = fieldInfo.isPublic ? 'public' : 'private'
    const type = fieldInfo.fieldType.isGeneric
      ? getGenericClassNameToString(fieldInfo.fieldType)
      : fieldInfo.fieldType.className

    return [getCsharpFieldCodeBlock(node.tagName, accessor, type)].join('  \n')
  }
}
