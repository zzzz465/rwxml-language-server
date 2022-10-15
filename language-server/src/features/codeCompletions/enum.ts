import { Node, Text, TypedElement } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import { expandUntil } from '../../utils/strings'
import { isLeafNode } from '../utils'
import { CodeCompletionContributor } from './contributor'

@tsyringe.injectable()
export class Enum implements CodeCompletionContributor {
  getCompletion(_: Project, node: Node, offset: number): ls.CompletionList | null {
    if (node instanceof Text && node.parent instanceof TypedElement) {
      node = node.parent as TypedElement
    }

    if (!(node instanceof TypedElement) || !node.typeInfo.isEnum || !isLeafNode(node) || !node.contentRange) {
      return null
    }

    const content = node.content ?? ''
    const relativeOffset = offset - node.contentRange.start
    const currentContent = expandUntil(
      content,
      relativeOffset,
      (c) => c !== ',',
      (c) => c !== ','
    )

    const haystacks = node.typeInfo.enums
    const matchedTypes = getMatchingText(haystacks, currentContent.text.trim())
    const items: ls.CompletionItem[] = matchedTypes.map((text) => ({
      label: text,
    }))

    return {
      isIncomplete: true,
      items,
    }
  }
}
