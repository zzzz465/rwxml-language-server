import { FieldInfo, Injectable, Node, TypeInfo } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { MarkupKind } from 'vscode-languageserver'
import * as winston from 'winston'
import { LogToken } from '../../log'
import { genericClassNameToString, getCsharpText } from '../utils/markdown'

@tsyringe.injectable()
export class TagHoverProvider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${TagHoverProvider.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(@tsyringe.inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  onTagHover(node: Node, offset: number): ls.Hover | null {
    if (!this.isPointingInjectableTagName(node, offset)) {
      return null
    }

    let value = ''

    if (node.fieldInfo) {
      value = this.getFieldHoverText(node, node.fieldInfo)
    } else {
      value = this.getTypeHoverText(node)
    }

    return { contents: { kind: MarkupKind.Markdown, value } }
  }

  private isPointingInjectableTagName(node: Node, offset: number): node is Injectable & boolean {
    if (!(node instanceof Injectable)) {
      return false
    }

    return node.openTagNameRange.include(offset) || node.closeTagNameRange.include(offset)
  }

  private getTypeHoverText(node: Injectable): string {
    const className = node.typeInfo.isGeneric ? this.genericClassNameToString(node.typeInfo) : node.typeInfo.className
    return ['```csharp', `class ${className}`, '```'].join('\n')
  }

  private getFieldHoverText(node: Injectable, fieldInfo: FieldInfo): string {
    const accessor = fieldInfo.isPublic ? 'public' : 'private'
    const type = fieldInfo.fieldType.isGeneric
      ? this.genericClassNameToString(fieldInfo.fieldType)
      : fieldInfo.fieldType.className

    return [this.getCsharpText(node.tagName, accessor, type)].join('  \n')
  }

  private getCsharpText(name: string, accessor: string, type: string): string {
    return getCsharpText(name, accessor, type)
  }

  private genericClassNameToString(typeInfo: TypeInfo): string {
    return genericClassNameToString(typeInfo)
  }
}
