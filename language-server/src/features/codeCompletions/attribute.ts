/* eslint-disable prettier/prettier */
import { Attribute, Element, Injectable } from '@rwxml/analyzer'
import { CompletionItem, CompletionItemKind } from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import { expandUntil, isAlpha } from '../../utils/strings'

// TODO

export function completeAttribute(project: Project, node: Injectable, offset: number): CompletionItem[] {
  const uri = node.document.uri
  const rawText = node.document.rawText
  const attribs = node.attribs
  const currentAttribute = findCurrentAttribute(node, offset)
  const candidates: string[] = []

  if (!attribs['Name']) {
    candidates.push('Name')
  }

  if (!attribs['ParentName']) {
    candidates.push('ParentName')
  }

  function completeAttributeName() {

  }

  function completeAttributeValue() {

  }

  if (currentAttribute) {
    if (isPointingAttributeName(currentAttribute, offset)) {
      completeAttributeName()
    } else if (isPointingAttributeValue(currentAttribute, offset)) {
      completeAttributeValue()
    }
  } else {
    if (offset > 0 && rawText[offset - 1] === ' ') {
      completeAttributeName()
    } else {
      return []
    }
  }

  const { text } = expandUntil(
    rawText,
    offset,
    (c) => c === ' ',
    (c) => isAlpha(c)
  )

  const matchingTexts = getMatchingText(candidates, text)

  const items = matchingTexts.map(label => ({
    label,
    kind: CompletionItemKind.Enum
  } as CompletionItem))

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
