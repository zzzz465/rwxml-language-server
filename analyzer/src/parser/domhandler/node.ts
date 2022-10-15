/* eslint-disable prettier/prettier */
// original source code: https://github.com/fb55/domhandler
// all rights goes to original author.

import { ElementType } from 'domelementtype'
import { Range } from '../range'

const nodeTypes = new Map<ElementType, number>([
  [ElementType.Tag, 1],
  [ElementType.Script, 1],
  [ElementType.Style, 1],
  [ElementType.Directive, 1],
  [ElementType.Text, 3],
  [ElementType.CDATA, 4],
  [ElementType.Comment, 8],
  [ElementType.Root, 9],
])

/**
 * This object will be used as the prototype for Nodes when creating a
 * DOM-Level-1-compliant structure.
 */
export class Node {
  /** Parent of the node */
  parent: NodeWithChildren | null = null

  /** Previous sibling */
  prev: Node | null = null

  /** Next sibling */
  next: Node | null = null

  readonly nodeRange = new Range()
  readonly openTagRange = new Range()
  readonly openTagNameRange = new Range()
  readonly closeTagRange = new Range()
  readonly closeTagNameRange = new Range()

  get startIndex(): number {
    return this.nodeRange.start
  }

  get endIndex(): number {
    return this.nodeRange.end
  }

  /**
   *
   * @param type The type of the node.
   */
  constructor(public type: ElementType) {}

  // Read-only aliases
  get nodeType(): number {
    return nodeTypes.get(this.type) ?? 1
  }

  // Read-write aliases for properties
  get parentNode(): NodeWithChildren | null {
    return this.parent
  }

  set parentNode(parent: NodeWithChildren | null) {
    this.parent = parent
  }

  get previousSibling(): Node | null {
    return this.prev
  }

  set previousSibling(prev: Node | null) {
    this.prev = prev
  }

  get nextSibling(): Node | null {
    return this.next
  }

  set nextSibling(next: Node | null) {
    this.next = next
  }
}

/**
 * A `Node` that can have children. must not be created, use Element instead.
 */
// NOTE: NodeWithChildren is used by Node, so it cannot be splitted to another file.
// or else it would make a circular dependency, which is unable to compile.
export class NodeWithChildren extends Node {
  /**
   * @param type Type of the node.
   * @param children Children of the node. Only certain node types can have children.
   */
  constructor(
    type: ElementType.Root | ElementType.CDATA | ElementType.Script | ElementType.Style | ElementType.Tag,
    public children: Node[]
  ) {
    super(type)
  }

  // Aliases
  get firstChild(): Node | null {
    return this.children[0] ?? null
  }

  get lastChild(): Node | null {
    return this.children.length > 0 ? this.children[this.children.length - 1] : null
  }

  get childNodes(): Node[] {
    return this.children
  }

  set childNodes(children: Node[]) {
    this.children = children
  }

  toString(): string {
    return this.childNodes.map((node) => node.toString()).join('')
  }
}
