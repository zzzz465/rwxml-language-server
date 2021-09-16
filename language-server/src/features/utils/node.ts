import { Def, Element, Injectable, Node, Text } from '@rwxml/analyzer'

export function isPointingContentOfNode(node: Node, offset: number): boolean {
  if (node instanceof Text && node.parent instanceof Element) {
    return node.parent.childNodes.length === 1
  } else if (node instanceof Element) {
    return node.childNodes.length === 0 && node.document.getCharAt(offset - 1) === '>'
  } else {
    return false
  }
}

// is cursor pointing defName content? (note: content not empty)
// TODO: check empty content when offset is provided
export function isPointingDefNameContent(node: Node, offset?: number): boolean {
  if (node instanceof Text) {
    if (node.parent instanceof Injectable && node.parent.name === 'defName' && node.parent.parent instanceof Def) {
      return true
    }
  }

  return false
}

export function makeTagNode(tag: string): string {
  return `<${tag}></${tag}>`
}
