import * as cheerio from 'cheerio'
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

  get startIndex(): number | null {
    return this.nodeRange.start == -1 ? null : this.nodeRange.start
  }

  get endIndex(): number | null {
    return this.nodeRange.end == -1 ? null : this.nodeRange.end
  }

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

  /**
   *
   * @param type The type of the node.
   */
  constructor(public type: ElementType) {}

  // DOM Level 1 aliases
  cloneNode<T extends cheerio.Node>(this: T, recursive = false): T {
    throw new Error('Not implemented')
  }
}

/**
 * A `Node` that can have children. must not be created, use Element instead.
 */
// NOTE: NodeWithChildren is used by Node, so it cannot be splitted to another file.
// or else it would make a circular dependency, which is unable to compile.
export class NodeWithChildren extends Node {
  /**
   * contentRange is the range starts after openining tag > and ends before closing tag <
   */
  get contentRange(): Range {
    return new Range(this.openTagRange.end, this.closeTagRange.start)
  }

  // Aliases
  get firstChild(): Node | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): Node | null {
    return this.childNodes.length > 0 ? this.childNodes[this.childNodes.length - 1] : null
  }

  get childNodes(): Node[] {
    return this._children
  }

  set childNodes(children: Node[]) {
    this._children = children
  }

  // DOM Level 1 aliases
  get children(): Node[] {
    return this._children
  }

  /**
   * @param type Type of the node.
   * @param _children Children of the node. Only certain node types can have children.
   */
  constructor(
    type: ElementType.Root | ElementType.CDATA | ElementType.Script | ElementType.Style | ElementType.Tag,
    private _children: Node[]
  ) {
    super(type)
  }

  toString(): string {
    return this.childNodes.map((node) => node.toString()).join('')
  }
}
