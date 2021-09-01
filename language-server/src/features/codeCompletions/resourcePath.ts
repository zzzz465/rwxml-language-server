import { Injectable, Node, Text } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import { CompletionItem, CompletionItemKind, TextEdit } from 'vscode-languageserver'
import { Range } from 'vscode-languageserver-textdocument'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import path from 'path'

export class ResourcePath {
  complete(project: Project, node: Node, offset: number): CompletionItem[] {
    // TODO: if <clipPath></clipPath>, no Text, fix this later.
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
