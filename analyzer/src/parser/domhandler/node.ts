/* eslint-disable prettier/prettier */
// original source code: https://github.com/fb55/domhandler
// all rights goes to original author.

import { ElementType, isTag as isTagRaw } from 'domelementtype'
import { sortedFindFirst } from '../../utils/arrays'
import { Range } from '../range'
import $ from 'cheerio'
import { TypeInfo } from '../../rimworld-types'

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

  /**
   * @deprecated exists for compability. not used.
   */
  startIndex: number | null = null

  /**
   * @deprecated exists for compability. not used.
   */
  endIndex: number | null = null

  /**
   *
   * @param type The type of the node.
   */
  constructor(public type: ElementType) { }

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
   * Clone this node, and optionally its children.
   *
   * @param recursive Clone child nodes as well.
   * @returns A clone of the node.
   */
  cloneNode<T extends Node>(this: T, recursive = false): T {
    return cloneNode(this, recursive)
  }

  toString(): string {
    throw new Error('toString not implemented')
  }
}

/**
 * A node that contains some data.
 */
export class DataNode extends Node {
  readonly nodeRange = new Range()
  readonly dataRange = new Range()

  /**
   * @param type The type of the node
   * @param data The content of the data node
   */
  constructor(type: ElementType.Comment | ElementType.Text | ElementType.Directive, public data: string) {
    super(type)
  }

  get nodeValue(): string {
    return this.data
  }

  set nodeValue(data: string) {
    this.data = data
  }

  get document(): Document {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Node = this
    while (!(node instanceof Document)) {
      if (node.parent) {
        node = node.parent
      } else {
        throw new Error(`node ${node}'s parent is not Document.`)
      }
    }

    return node
  }

  findNodeAt(offset: number): RangedNode | undefined {
    return findNodeAt(this, offset)
  }

  toString(): string {
    return this.data
  }
}

/**
 * Text within the document.
 */
export class Text extends DataNode {
  /**
   * enum, boolean can have TypeInfo
   */
  typeInfo: TypeInfo | null = null

  constructor(data: string) {
    super(ElementType.Text, data)
  }
}

/**
 * Comments within the document.
 */
export class Comment extends DataNode {
  constructor(data: string) {
    super(ElementType.Comment, data)
  }

  toString(): string {
    // TODO: should I return this with <!-- data --> ??
    return this.data
  }
}

/**
 * Processing instructions, including doc types.
 */
export class ProcessingInstruction extends DataNode {
  constructor(public name: string, data: string) {
    super(ElementType.Directive, data)
  }

  'x-name'?: string
  'x-publicId'?: string
  'x-systemId'?: string
}

/**
 * A `Node` that can have children. must not be created, use Element instead.
 */
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
    return findNodeAt(this as unknown as Element, offset)
  }

  findNode(predicate: (node: Element) => boolean): Element[] {
    const ret: Element[] = []

    for (const child of this.children.filter((node: any) => node instanceof Element) as Element[]) {
      findNode(ret, child, predicate)
    }

    return ret
  }

  'x-mode'?: 'no-quirks' | 'quirks' | 'limited-quirks'

  toString(): string {
    return this.rawText
  }
}

/**
 * The description of an individual attribute.
 */
export interface Attribute {
  name: string
  value: string
  nameRange: Range
  valueRange: Range
  namespace?: string
  prefix?: string
}

/**
 * An element within the DOM.
 */
export class Element extends NodeWithChildren {
  readonly nodeRange = new Range()
  readonly openTagRange = new Range()
  readonly openTagNameRange = new Range()
  readonly closeTagRange = new Range()
  readonly closeTagNameRange = new Range()

  // what about self closing?

  /**
   * @param name Name of the tag, eg. `div`, `span`.
   * @param attribs Object mapping attribute names to attribute values.
   * @param children Children of the node.
   */
  constructor(
    public name: string,
    public attribs: { [name: string]: Attribute },
    children: Node[] = [],
    type: ElementType.Tag | ElementType.Script | ElementType.Style = name === 'script'
      ? ElementType.Script
      : name === 'style'
        ? ElementType.Style
        : ElementType.Tag
  ) {
    super(type, children)
  }

  /**
   * text content of element if exists. returns undefined.d
   */
  get content(): string | undefined {
    if (this.firstChild && this.firstChild instanceof Text) {
      return this.firstChild.data
    }
  }

  get contentRange(): Range | undefined {
    if (this.firstChild && this.firstChild instanceof Text) {
      return this.firstChild.dataRange
    }
  }

  get document(): Document {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Node = this
    while (!(node instanceof Document)) {
      if (node.parent) {
        node = node.parent
      } else {
        throw new Error(`node ${node}'s parent is not Document.`)
      }
    }

    return node
  }

  get ChildElementNodes(): Element[] {
    return this.children.filter(node => node instanceof Element) as Element[]
  }

  // DOM Level 1 aliases
  get tagName(): string {
    return this.name
  }

  set tagName(name: string) {
    this.name = name
  }

  get attributes() {
    return Object.values(this.attribs)
  }

  get leafNode() {
    return this.ChildElementNodes.length === 0
  }

  findNodeAt(offset: number) {
    return findNodeAt(this, offset)
  }

  findNode(predicate: (node: Element) => boolean): Element[] {
    const ret: Element[] = []

    findNode(ret, this, predicate)

    return ret
  }

  'x-attribsNamespace'?: Record<string, string>
  'x-attribsPrefix'?: Record<string, string>

  toString(): string {
    const openTagString = this.document.rawText.slice(this.openTagRange.start, this.openTagRange.end)
    const closeTagString = this.document.rawText.slice(this.closeTagRange.start, this.closeTagRange.end)
    return `${openTagString}${super.toString()}${closeTagString}`
  }
}

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

type RangedNode = Element | DataNode

// NOTE: is this really needed?
function isRangedNode(node: Node): node is RangedNode {
  return node instanceof Element || node instanceof DataNode
}

// TODO: return null instead of undefined
// TODO: refactor code for higher readability.
function findNodeAt(node: Node, offset: number): RangedNode | undefined {
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

  if (isRangedNode(node)) {
    if (node.nodeRange.include(offset)) {
      return node
    }
  }
}

function findNode<T extends Element>(dest: T[], node: T, predicate: (node: T) => boolean) {
  if (predicate(node)) {
    dest.push(node)
  }

  for (const child of node.ChildElementNodes) {
    findNode(dest, child as T, predicate)
  }
}
