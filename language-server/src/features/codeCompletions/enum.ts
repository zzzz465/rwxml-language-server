import { Injectable, Node, Text } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import { CodeCompletionContributor } from './contributor'

@tsyringe.injectable()
export class Enum implements CodeCompletionContributor {
  getCompletion(_: Project, node: Node): ls.CompletionList | null {
    if (node instanceof Text && node.parent instanceof Injectable) {
      node = node.parent as Injectable
    }

    if (!(node instanceof Injectable) || !node.typeInfo.isEnum) {
      return null
    }

    const content = node.content ?? ''
    const haystacks = node.typeInfo.enums
    const matchedTypes = getMatchingText(haystacks, content)
    const items: ls.CompletionItem[] = matchedTypes.map((text) => ({
      label: text,
    }))

    return {
      isIncomplete: true,
      items,
    }
  }
}
