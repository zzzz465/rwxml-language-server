import { Node, Text, TypedElement, TypeInfo } from '@rwxml/analyzer'
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
    if (node instanceof Text && node.parent instanceof TypedElement) {
      node = node.parent as TypedElement
    }

    if (!(node instanceof TypedElement)) {
      return null
    }

    if (!node.typeInfo.isType()) {
      return null
    }

    const content = node.content ?? ''

    let hayStackTypes: TypeInfo[] = []
    if (node.tagName.toLowerCase().includes('comp')) {
      hayStackTypes = project.defManager.typeInfoMap.getAllCompTypes()
    } else if (node.tagName.toLowerCase().includes('verb')) {
      hayStackTypes = project.defManager.typeInfoMap.getAllVerbTypes()
    }

    const haystacks = AsEnumerable(hayStackTypes)
      .Select((type) => getTypeReferenceName(type))
      .Distinct((typeName) => typeName)
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
