import { Def, Document, Element, Injectable, Node, NodeWithChildren, Text } from '@rwxml/analyzer'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import * as lsp from 'vscode-languageserver'
import { container } from 'tsyringe'
import { Queue } from 'typescript-collections'

export function isPointingContentOfNode(node: Node, offset: number): boolean {
  if (node instanceof Text && node.parent instanceof Element) {
    return node.parent.childNodes.length === 1
  } else if (node instanceof Element) {
    return node.childNodes.length === 0 && node.document.getCharAt(offset - 1) === '>'
  } else {
    return false
  }
}

// is cursor pointing Def.defName content? (note: content not empty)
// TODO: check empty content when offset is provided
export function isPointingDefNameContent(node: Node, offset?: number): boolean {
  if (node instanceof Text) {
    if (node.parent instanceof Injectable && node.parent.name === 'defName' && node.parent.parent instanceof Def) {
      return true
    }
  } else if (offset !== undefined) {
    if (node instanceof Element && node.name === 'defName') {
      if (node.contentRange) {
        return node.contentRange.include(offset)
      } else {
        return offset === node.openTagRange.end + 1
      }
    }
  }

  return false
}

export function isDefRefContent(node: Node): node is Text {
  if (
    node instanceof Text &&
    node.parent instanceof Injectable &&
    (node.parent.parent instanceof Injectable || node.parent.parent instanceof Def)
  ) {
    if (node.parent.parent.typeInfo.isEnumerable() && node.parent.typeInfo.isDef()) {
      // if node is child of list node
      return true
    } else if (node.parent.fieldInfo?.fieldType.isDef()) {
      return true
    }
  }

  return false
}

export function isPointingParentNameAttributeValue(node: Node, offset: number): boolean {
  if (!(node instanceof Def || node instanceof Injectable)) {
    return false
  }

  for (const attrib of node.attributes) {
    if (attrib.name !== 'ParentName') {
      continue
    }

    if (attrib.valueRange.include(offset)) {
      return true
    }
  }

  return false
}

export function isPointingInjectableTag(node: Node, offset: number): boolean {
  if (!(node instanceof Injectable)) {
    return false
  }

  return node.openTagNameRange.include(offset) || node.closeTagNameRange.include(offset)
}

export function makeTagNode(tag: string): string {
  return `<${tag}></${tag}>`
}

export function toLocation(converter: RangeConverter, node: Element | Text) {
  const range = converter.toLanguageServerRange(node.nodeRange, node.document.uri)
  return range
}

export function getNodeAndOffset(project: Project, uri: URI, position: lsp.Position) {
  const rangeConverter = container.resolve(RangeConverter)

  const offset = rangeConverter.toOffset(position, uri.toString())
  const document = project.getXMLDocumentByUri(uri)

  if (!offset || !document) {
    return
  }

  const node = document?.findNodeAt(offset)

  if (!node) {
    return
  }

  return { offset, document, node }
}

export function isDefOrInjectable(node: Node | null | undefined): node is Def | Injectable {
  return !!node && (node instanceof Def || node instanceof Injectable)
}

/**
 * 1. text node and opening a tag eg. <foo> <| </foo>
 * 2. element and selecting a opening tag name <s|ome...
 */
export function isPointingOpenTagName(node: Element | Text, offset: number): boolean {
  if (node instanceof Text) {
    const localOffset = offset - node.dataRange.start - 1
    const beforeCursor = node.data.charAt(localOffset)

    return beforeCursor === '<'
  } else {
    return node.openTagNameRange.include(offset)
  }
}

export function getNodesBFS(doc: Document): Node[] {
  const nodes: Node[] = []
  const queue = new Queue<Node>()

  queue.enqueue(doc)
  while (queue.size() > 0) {
    const node = queue.dequeue() as Node

    if (node instanceof NodeWithChildren) {
      for (const child of node.childNodes) {
        queue.enqueue(child)
      }
    }

    nodes.push(node)
  }

  return nodes
}
