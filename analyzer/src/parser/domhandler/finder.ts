// TODO: return null instead of undefined

import { sortedFindFirst } from '../../utils/arrays'
import { NodeWithChildren } from './node'

// TODO: refactor code for higher readability.
export function findNodeAt(node: Node, offset: number): Element | null {
  if (node instanceof NodeWithChildren) {
    const index = sortedFindFirst(node.childNodes, (child: any) => child.nodeRange && child.nodeRange.start <= offset)
    if (index >= 0) {
      const child = node.childNodes[index]
      const result = findNodeAt(child, offset)

      if (result) {
        return result
      }
    }
  }

  if (node instanceof Element)
    if (isRangedNode(node)) {
      if (node.nodeRange.include(offset)) {
        return node
      }
    }
}

export function findNode(dst: Node[], node: Node, predicate: (node: Node) => boolean): void {
  if (predicate(node)) {
    dst.push(node)
  }

  if (node instanceof NodeWithChildren) {
    node.children.forEach((childNode) => findNode(dst, childNode, predicate))
  }
}
