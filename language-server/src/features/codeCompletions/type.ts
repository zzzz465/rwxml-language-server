import { Injectable, Node, Text } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import { getTypeReferenceName } from '../utils/type'
import { CodeCompletionContributor } from './contributor'

@tsyringe.injectable()
export class Type implements CodeCompletionContributor {
  getCompletion(project: Project, node: Node): ls.CompletionList | null {
    if (node instanceof Text && node.parent instanceof Injectable) {
      node = node.parent as Injectable
    }

    if (!(node instanceof Injectable)) {
      return null
    }

    if (!node.typeInfo.isType()) {
      return null
    }

    const content = node.content ?? ''

    const haystacks = AsEnumerable(project.defManager.typeInfoMap.getAllVerbTypes())
      .Select((x) => getTypeReferenceName(x))
      .Distinct((x) => x)
      .ToArray()

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
