import { ElementType } from 'domelementtype'
import { Node, NodeWithChildren } from './node'
import { findNode, findNodeAt } from './utils'

/**
 * The root node of the document.
 */

export class Document extends NodeWithChildren {
  uri: string
  rawText: string

  constructor(children: Node[], uri?: string, rawText = '') {
    super(ElementType.Root, children)
    this.uri = uri ?? ''
    this.rawText = rawText
  }

  getCharAt(offset: number): string {
    return this.rawText.charAt(offset)
  }

  findNodeAt(offset: number) {
    return findNodeAt(this, offset)
  }

  findNode(predicate: (node: Node) => boolean): Node[] {
    const ret: Node[] = []

    this.children.forEach((childNode) => findNode(ret, childNode, predicate))

    return ret
  }

  'x-mode'?: 'no-quirks' | 'quirks' | 'limited-quirks'

  toString(): string {
    return this.rawText
  }
}
