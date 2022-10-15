import { ElementType } from 'domelementtype'
import { sortedFindFirst } from '../../utils/arrays'
import { Attribute } from './attribute'
import { Document } from './document'
import { Node, NodeWithChildren } from './node'

/**
 * An element within the DOM.
 */
export class Element extends NodeWithChildren {
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

  // return content inside <tag>[here]</tag> as a string form.
  get content(): string {
    const start = this.contentRange.start
    const end = this.contentRange.end

    // it's wise to just copy the content because
    // in most cases, content shouldn't long enough to cause performance issue.
    // when the caller wants to store content, referencing may creates a leak.
    return this.document.rawText.slice(start, end).repeat(1)
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
    return this.childNodes.filter((node) => node instanceof Element) as Element[]
  }

  // DOM Level 1 aliases
  get tagName(): string {
    return this.name
  }

  set tagName(name: string) {
    this.name = name
  }

  get attributes(): Attribute[] {
    return Object.values(this.attribs)
  }

  get leafNode(): boolean {
    return this.ChildElementNodes.length === 0
  }

  findNodeAt(offset: number): Node | null {
    const predicate = (node: Node): boolean => {
      if (node instanceof Element) {
        return node.nodeRange.start <= offset
      }

      return false
    }

    if (!this.nodeRange.include(offset)) {
      return null
    }

    const index = sortedFindFirst(this.childNodes, predicate)
    if (index >= 0) {
      const child = this.childNodes[index]
      if (child instanceof Element) {
        return child.findNodeAt(offset)
      }

      // TODO: impl
    }

    return null
  }

  findNode(predicate: (node: Node) => boolean): Element[] {
    const result: Element[] = []

    if (predicate(this)) {
      result.push(this)
    }

    for (const child of this.childNodes) {
      if (child instanceof Element) {
        result.push(...child.findNode(predicate))
      }
    }

    return result
  }

  'x-attribsNamespace'?: Record<string, string>
  'x-attribsPrefix'?: Record<string, string>

  toString(): string {
    const openTagString = this.document.rawText.slice(this.openTagRange.start, this.openTagRange.end)
    const closeTagString = this.document.rawText.slice(this.closeTagRange.start, this.closeTagRange.end)
    return `${openTagString}${super.toString()}${closeTagString}`
  }
}
