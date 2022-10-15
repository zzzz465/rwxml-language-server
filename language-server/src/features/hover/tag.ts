import { FieldInfo, TypedElement } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { MarkupKind } from 'vscode-languageserver'
import * as winston from 'winston'
import defaultLogger, { withClass } from '../../log'
import { isOffsetOnCloseTag, isOffsetOnOpenTag } from '../utils'
import { getClassNameCodeBlock, getCsharpFieldCodeBlock, getGenericClassNameToString } from '../utils/markdown'

@tsyringe.injectable()
export class TagHoverProvider {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(TagHoverProvider)),
    transports: [defaultLogger()],
  })

  onTagHover(node: TypedElement, offset: number): ls.Hover | null {
    if (node.fieldInfo && (isOffsetOnOpenTag(node, offset) || isOffsetOnCloseTag(node, offset))) {
      return {
        contents: { kind: MarkupKind.Markdown, value: this.getFieldHoverText(node, node.fieldInfo) },
      }
    } else {
      return {
        contents: { kind: MarkupKind.Markdown, value: getClassNameCodeBlock(node) },
      }
    }
  }

  private getFieldHoverText(node: TypedElement, fieldInfo: FieldInfo): string {
    const accessor = fieldInfo.isPublic ? 'public' : 'private'
    const type = fieldInfo.fieldType.isGeneric
      ? getGenericClassNameToString(fieldInfo.fieldType)
      : fieldInfo.fieldType.className

    return [getCsharpFieldCodeBlock(node.tagName, accessor, type)].join('  \n')
  }
}
