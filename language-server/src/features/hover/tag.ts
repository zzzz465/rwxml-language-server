import { Injectable, Node, TypeInfo } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import * as winston from 'winston'
import { LogToken } from '../../log'

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

    if (node.typeInfo.isGeneric) {
      value = this.getGenericTypeHoverText(node)
    } else if (node.fieldInfo || (node.parent instanceof Injectable && node.parent.typeInfo.isGeneric)) {
      const typeInfo = node.fieldInfo?.fieldType ?? node.parent.typeInfo.genericArguments[0]
      value = this.getHoverText(node, typeInfo)
    } else {
      // WHAT?
      this.log.error(`unexpected state occured. file: ${node.document.uri}, offset: ${offset}`)
    }

    return { contents: { kind: 'markdown', value } }
  }

  private isPointingInjectableTagName(node: Node, offset: number): node is Injectable & boolean {
    if (!(node instanceof Injectable)) {
      return false
    }

    return node.openTagNameRange.include(offset) || node.closeTagNameRange.include(offset)
  }

  private getGenericTypeHoverText(node: Injectable): string {
    const tagName = node.tagName
    const className = this.genericClassNameToString(node.typeInfo)
    const fullName = `${node.typeInfo.namespaceName}.${className}`

    return [`**${tagName}**: \`${className}\``, '********', `fullName: \`${fullName}\``].join('  \n')
  }

  private getHoverText(node: Injectable, typeInfo: TypeInfo): string {
    // NOTE: can genericArguments.length be 0 when isGeneric? (List<> can do though.)
    const tagName = node.tagName
    const extendString = !!typeInfo.baseClass ? `extends \`${typeInfo.baseClass.className}\`` : ''

    return [
      `**${tagName}**: \`${typeInfo.className}\` ${extendString}`,
      '********',
      `fullName: \`${typeInfo.fullName}\``,
    ].join('  \n')
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
