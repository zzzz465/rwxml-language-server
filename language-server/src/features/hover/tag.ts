import { Injectable, Node, TypeInfo } from '@rwxml/analyzer'
import _ from 'lodash'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import * as winston from 'winston'
import { MarkupContent } from 'vscode-languageserver'
import { LogToken } from '../../log'

@tsyringe.injectable()
export class TagHoverProvider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${TagHoverProvider.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(@tsyringe.inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  onTagHover(node: Node, offset: number): ls.Hover | null {
    if (!(node instanceof Injectable && node.openTagRange.include(offset))) {
      return null
    }

    const tagName = node.tagName
    const contents: MarkupContent = { kind: 'markdown', value: '' }

    if (node.typeInfo.isGeneric) {
      const className = this.genericClassNameToString(node.typeInfo)
      const fullName = `${node.typeInfo.namespaceName}.${className}`

      contents.value = [`**${tagName}**: \`${className}\``, '********', `fullName: \`${fullName}\``].join('  \n')
    } else if (node.fieldInfo || (node.parent instanceof Injectable && node.parent.typeInfo.isGeneric)) {
      // NOTE: can genericArguments.length be 0 when isGeneric? (List<> can do though.)
      const fieldType = node.fieldInfo?.fieldType ?? node.parent.typeInfo.genericArguments[0]
      const extendString = !!fieldType.baseClass ? `extends \`${fieldType.baseClass.className}\`` : ''

      contents.value = [
        `**${tagName}**: \`${fieldType.className}\` ${extendString}`,
        '********',
        `fullName: \`${fieldType.fullName}\``,
      ].join('  \n')
    } else {
      this.log.error(`unexpected state occured. file: ${node.document.uri}, offset: ${offset}`)
      // WHAT?
    }

    return { contents }
  }

  private genericClassNameToString(typeInfo: TypeInfo): string {
    const [name] = typeInfo.className.split('`')

    const genArgs = typeInfo.genericArguments
      .map((t) => {
        return t.isGeneric ? this.genericClassNameToString(t) : t.className
      })
      .join(', ')

    return `${name}\<${genArgs}\>`
  }
}
