import { Injectable, Node, TypeInfo } from '@rwxml/analyzer'
import _ from 'lodash'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { MarkupContent } from 'vscode-languageserver'

@tsyringe.injectable()
export class TagHoverProvider {
  onTagHover(node: Node, offset: number): ls.Hover | null {
    if (!(node instanceof Injectable && node.fieldInfo && node.openTagRange.include(offset))) {
      return null
    }

    const tagName = node.tagName
    const { fieldType } = node.fieldInfo
    const contents: MarkupContent = { kind: 'markdown', value: '' }

    if (fieldType.isGeneric) {
      const className = this.genericClassNameToString(fieldType)
      const fullName = `${fieldType.namespaceName}.${className}`

      contents.value = [`**${tagName}**: \`${className}\``, '********', `fullName: \`${fullName}\``].join('  \n')
    } else {
      const extendString = !!fieldType.baseClass ? `extends \`${fieldType.baseClass.className}\`` : ''

      contents.value = [
        `**${tagName}**: \`${fieldType.className}\` ${extendString}`,
        '********',
        `fullName: \`${fieldType.fullName}\``,
      ].join('  \n')
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
