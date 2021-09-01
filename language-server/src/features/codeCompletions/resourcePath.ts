import { Injectable, Node, Text } from '@rwxml/analyzer'
import { CompletionItem, CompletionItemKind, TextEdit } from 'vscode-languageserver'
import { Range } from 'vscode-languageserver-textdocument'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'

export class ResourcePath {
  complete(project: Project, node: Node, offset: number): CompletionItem[] {
    const parentNode = node.parent
    if (!(node instanceof Text) || !(parentNode instanceof Injectable)) {
      return []
    }

    const editRange = project.rangeConverter.toLanguageServerRange(node.dataRange, node.document.uri)
    if (!editRange) {
      return []
    }

    const liFieldtypeClassName = parentNode.parent.typeInfo.className
    if (liFieldtypeClassName === 'AudioGrain_Clip' || liFieldtypeClassName === 'AudioGrain_Folder') {
      return this.completeTexturePath(project, node, parentNode, offset, editRange, liFieldtypeClassName)
    } else if (parentNode.name.endsWith('path')) {
      // TODO:
      return []
    } else {
      return []
    }
  }

  private completeTexturePath(
    project: Project,
    node: Text,
    parentNode: Injectable,
    offset: number,
    editRange: Range,
    fieldTypeClassName: string
  ): CompletionItem[] {
    const text = node.data

    const possibleValues: string[] = []

    if (fieldTypeClassName === 'AudioGrain_Clip') {
      possibleValues.push(...project.fileManager.audios.values())
    } else if (fieldTypeClassName === 'AudioGrain_Folder') {
      possibleValues.push(...project.fileManager.audioDirectories.values())
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
