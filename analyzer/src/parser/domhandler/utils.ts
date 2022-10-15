import { ElementType, isTag as isTagRaw } from 'domelementtype'
import { sortedFindFirst } from '../../utils/arrays'
import { Comment } from './Comment'
import { DataNode } from './dataNode'
import { Document } from './document'
import { Element } from './element'
import { Node, NodeWithChildren } from './node'
import { ProcessingInstruction } from './processingInstruction'
import { Text } from './text'

/**
 * @param node Node to check.
 * @returns `true` if the node is a `Element`, `false` otherwise.
 */
export function isTag(node: Node): node is Element {
  return isTagRaw(node)
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `CDATA`, `false` otherwise.
 */
export function isCDATA(node: Node): node is NodeWithChildren {
  return node.type === ElementType.CDATA
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `Text`, `false` otherwise.
 */
export function isText(node: Node): node is Text {
  return node.type === ElementType.Text
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `Comment`, `false` otherwise.
 */
export function isComment(node: Node): node is DataNode {
  return node.type === ElementType.Comment
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `ProcessingInstruction`, `false` otherwise.
 */
export function isDirective(node: Node): node is ProcessingInstruction {
  return node.type === ElementType.Directive
}

/**
 * @param node Node to check.
 * @returns `true` if the node has the type `ProcessingInstruction`, `false` otherwise.
 */
export function isDocument(node: Node): node is Document {
  return node.type === ElementType.Root
}

/**
 * @param node Node to check.
 * @returns `true` if the node is a `NodeWithChildren` (has children), `false` otherwise.
 */
export function hasChildren(node: Node): node is NodeWithChildren {
  return Object.prototype.hasOwnProperty.call(node, 'children')
}

/**
 * Clone a node, and optionally its children.
 *
 * @param recursive Clone child nodes as well.
 * @returns A clone of the node.
 * @deprecated not implemented yet.
 */
export function cloneNode<T extends Node>(node: T, recursive = false): T {
  let result: Node

  if (isText(node)) {
    result = new Text(node.data)
  } else if (isComment(node)) {
    result = new Comment(node.data)
  } else if (isTag(node)) {
    const children = recursive ? cloneChildren(node.children) : []
    const clone = new Element(node.name, { ...node.attribs }, children)
    children.forEach((child) => (child.parent = clone))

    Object.assign(clone.nodeRange, node.nodeRange)
    Object.assign(clone.openTagRange, node.openTagRange)
    Object.assign(clone.openTagNameRange, node.openTagNameRange)
    Object.assign(clone.closeTagRange, node.closeTagRange)
    Object.assign(clone.closeTagNameRange, node.closeTagNameRange)

    if (node['x-attribsNamespace']) {
      clone['x-attribsNamespace'] = { ...node['x-attribsNamespace'] }
    }
    if (node['x-attribsPrefix']) {
      clone['x-attribsPrefix'] = { ...node['x-attribsPrefix'] }
    }

    result = clone
  } else if (isCDATA(node)) {
    const children = recursive ? cloneChildren(node.children) : []
    const clone = new NodeWithChildren(ElementType.CDATA, children)
    children.forEach((child) => (child.parent = clone))
    result = clone
  } else if (isDocument(node)) {
    const children = recursive ? cloneChildren(node.children) : []
    const clone = new Document(children)
    children.forEach((child) => (child.parent = clone))

    if (node['x-mode']) {
      clone['x-mode'] = node['x-mode']
    }

    result = clone
  } else if (isDirective(node)) {
    const instruction = new ProcessingInstruction(node.name, node.data)

    if (node['x-name'] != null) {
      instruction['x-name'] = node['x-name']
      instruction['x-publicId'] = node['x-publicId']
      instruction['x-systemId'] = node['x-systemId']
    }

    result = instruction
  } else {
    throw new Error(`Not implemented yet: ${node.type}`)
  }

  result.parent = node.parent
  result.prev = node.prev
  result.next = node.next
  result.startIndex = node.startIndex
  result.endIndex = node.endIndex
  return result as T
}

function cloneChildren(childs: Node[]): Node[] {
  const children = childs.map((child) => cloneNode(child, true))

  for (let i = 1; i < children.length; i++) {
    children[i].prev = children[i - 1]
    children[i - 1].next = children[i]
  }

  return children
}
