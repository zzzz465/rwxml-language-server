import { ElementType, isTag as isTagRaw } from 'domelementtype'
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

export function replaceNode(oldNode: Node, newNode: Node): void {
  if (oldNode.parent) {
    const index = oldNode.parent.childNodes.indexOf(oldNode)
    oldNode.parent.childNodes[index] = newNode
  }

  if (oldNode instanceof NodeWithChildren) {
    // TODO: move this check code to head.
    // (currently typescript type system doesn't support this)
    if (!(newNode instanceof NodeWithChildren)) {
      throw new Error('Cannot replace a NodeWithChildren with a Node')
    }

    for (const childNode of oldNode.childNodes) {
      childNode.parent = newNode
    }
  }
}
