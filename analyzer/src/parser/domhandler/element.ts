import { ElementType } from 'domelementtype'
import { Range } from '../range'
import { Attribute } from './attribute'
import { Document } from './document'
import { Node, NodeWithChildren } from './node'
import { Text } from './text'
import { findNode, findNodeAt } from './utils'

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
    // prettier-ignore
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
    return this.children.filter((node) => node instanceof Element) as Element[]
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

  findNode(predicate: (node: Node) => boolean): Element[] {
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
