/* eslint-disable prettier/prettier */
import { Attribute, Element, Injectable, Node } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import { CompletionItem, CompletionItemKind, TextEdit } from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import { expandUntil, isAlpha } from '../../utils/strings'

const knownAttributeNames = ['Name', 'ParentName', 'Class', 'Abstract', 'Inherit', 'MayRequire']

export function completeAttribute(project: Project, node: Node, offset: number): CompletionItem[] {
  if (!(node instanceof Element) || !node.openTagRange.include(offset)) {
    return []
  }

  const attribs = node.attribs
  const items: CompletionItem[] = []
  const currentAttribute = findCurrentAttribute(node, offset)
  const currentPointingText = expandUntil(node.document.rawText, offset, (c) => isAlpha(c), (c) => isAlpha(c))
  const textRange = project.rangeConverter.toLanguageServerRange(currentPointingText.range, node.document.uri)

  if (!textRange) {
    return []
  }

  if ((currentAttribute && isPointingAttributeName(currentAttribute, offset)) || (!currentAttribute && offset > 0 && node.document.getCharAt(offset) === ' ')) {
    // selecting attribute name, or selecting whitespace inside starting tag
    const attrNameCandidates = AsEnumerable(knownAttributeNames)
      .Where((name) => !attribs[name])
      .ToArray()
    const completions = getMatchingText(attrNameCandidates, currentPointingText.text)

    items.push(...completions.map((label) => ({
      label,
      kind: CompletionItemKind.Enum,
      textEdit: label.length > 0 ? TextEdit.replace(textRange, label) : undefined
    }) as CompletionItem))
  } else if (currentAttribute && isPointingAttributeValue(currentAttribute, offset)) {
    // selecting attribute values
    switch(currentAttribute.name) {
      case 'ParentName': {
        const defs = project.nameDatabase.getDef(node.name)
        const candidates = AsEnumerable(defs)
          .Where((def) => !!def.getNameAttributeValue())
          .Select((def) => def.getNameAttributeValue() as string)
          .ToArray()
        
        const completions = getMatchingText(candidates, currentPointingText.text)

        items.push(...completions.map((label) => ({
          label,
          kind: CompletionItemKind.EnumMember,
          textEdit: label.length > 0 ? TextEdit.replace(textRange, label) : undefined
        } as CompletionItem)))
      } break

      case 'Class':
        // TODO: how to implement this...?
        break
      
      case 'Abstract':
      case 'Inherit':
        items.push({ label: 'true', kind: CompletionItemKind.EnumMember, textEdit:TextEdit.replace(textRange, 'true') })
        items.push({ label: 'false', kind: CompletionItemKind.EnumMember, textEdit:TextEdit.replace(textRange, 'false') })
        break
    }
  }

  return items
}

function findCurrentAttribute(node: Element, offset: number): Attribute | undefined {
  return node.attributes.find((attr) => attr.nameRange.include(offset) || attr.valueRange.include(offset))
}

function isPointingAttributeName(attr: Attribute, offset: number): boolean {
  return attr.nameRange.include(offset)
}

function isPointingAttributeValue(attr: Attribute, offset: number): boolean {
  return attr.valueRange.include(offset)
}
