import { Injectable, Node, Text } from '@rwxml/analyzer'
import * as rwxml from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import { CompletionItem, CompletionItemKind, TextEdit } from 'vscode-languageserver'
import { Range } from 'vscode-languageserver-textdocument'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import path from 'path'

export class ResourcePath {
  complete(project: Project, node: Node, offset: number): CompletionItem[] {
    let tagNode: Injectable
    let editRange: Range | undefined
    let text: string

    if (node instanceof Text && node.parent instanceof Injectable) {
      tagNode = node.parent
      text = node.nodeValue
      editRange = project.rangeConverter.toLanguageServerRange(node.dataRange, node.document.uri)
    } else if (node instanceof Injectable) {
      tagNode = node
      text = ''
      editRange = project.rangeConverter.toLanguageServerRange(new rwxml.Range(offset, offset), node.document.uri)
    } else {
      return []
    }

    if (!editRange) {
      return []
    }

    const liFieldtypeClassName = tagNode.parent.typeInfo.className
    if (liFieldtypeClassName === 'AudioGrain_Clip' || liFieldtypeClassName === 'AudioGrain_Folder') {
      return this.completeAudioPath(project, text, editRange, liFieldtypeClassName)
    } else if (tagNode.name.endsWith('path')) {
      // TODO:
      return []
    } else {
      return []
    }
  }

  private completeAudioPath(
    project: Project,
    text: string,
    editRange: Range,
    fieldTypeClassName: string
  ): CompletionItem[] {
    const possibleValues: string[] = []

    if (fieldTypeClassName === 'AudioGrain_Clip') {
      possibleValues.push(
        ...AsEnumerable(project.resourceManager.audios.values())
          .Select((p) => {
            const parsed = path.parse(p)
            return [parsed.dir, parsed.name].join('/')
          })
          .ToArray()
      )
    } else if (fieldTypeClassName === 'AudioGrain_Folder') {
      possibleValues.push(...project.resourceManager.audioDirectories.values())
    }

    const candidates = getMatchingText(possibleValues, text)

    return candidates.map(
      (label) =>
        ({
          label,
          kind: CompletionItemKind.File,
          textEdit: text.length > 0 ? TextEdit.replace(editRange, label) : undefined,
        } as CompletionItem)
    )
  }
}
