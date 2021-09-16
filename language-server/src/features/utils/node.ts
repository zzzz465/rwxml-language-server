import { Element, Node, Text } from '@rwxml/analyzer'

export function isPointingContentOfNode(node: Node, offset: number): boolean {
  if (node instanceof Text && node.parent instanceof Element) {
    return node.parent.childNodes.length === 1
  } else if (node instanceof Element) {
    return node.childNodes.length === 0 && node.document.getCharAt(offset - 1) === '>'
  } else {
    return false
  }
}

export function makeTagNode(tag: string): string {
  return `<${tag}></${tag}>`
}
