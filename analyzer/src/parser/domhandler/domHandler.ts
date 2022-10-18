import { ElementType } from 'domelementtype'
import { Parser } from '../htmlparser2'
import { Attribute } from '../node/attribute'
import { Comment } from '../node/comment'
import { DataNode } from '../node/dataNode'
import { Document } from '../node/document'
import { Element } from '../node/element'
import { Node, NodeWithChildren } from '../node/node'
import { ProcessingInstruction } from '../node/processingInstruction'
import { Text } from '../node/text'

type Callback = (error: Error | null, dom: Node[]) => void
type ElementCallback = (element: Element) => void

export class DomHandler {
  /** The elements of the DOM */
  public dom: Node[] = []

  /** The root element for the DOM */
  public root = new Document(this.dom)

  /** Called once parsing has completed. */
  private readonly callback: Callback | null

  /** Callback whenever a tag is closed. */
  private readonly elementCB: ElementCallback | null

  /** Indicated whether parsing has been completed. */
  private done = false

  /** Stack of open tags. */
  protected tagStack: NodeWithChildren[] = [this.root]

  /** A data node that is still being written to. */
  protected lastNode: DataNode | null = null

  /** Reference to the parser instance. Used for location information. */
  private parser!: Parser

  /**
   * @param callback Called once parsing has completed.
   * @param options Settings for the handler.
   * @param elementCB Callback whenever a tag is closed.
   */
  public constructor(callback?: Callback | null, elementCB?: ElementCallback) {
    // Make it possible to skip arguments, for backwards-compatibility
    this.callback = callback ?? null
    this.elementCB = elementCB ?? null
  }

  public onparserinit(parser: Parser): void {
    this.parser = parser
  }

  // Resets the handler back to starting state
  public onreset(): void {
    this.dom = []
    this.root = new Document(this.dom)
    this.done = false
    this.tagStack = [this.root]
    this.lastNode = null
    this.parser = this.parser ?? null
  }

  // Signals the handler that parsing is done
  public onend(): void {
    if (this.done) return
    this.root.rawText = this.parser.rawText
    this.done = true
    this.handleCallback(null)
  }

  public onerror(error: Error): void {
    this.handleCallback(error)
  }

  public onclosetag(): void {
    this.lastNode = null

    const elem = this.tagStack.pop() as Element
    elem.nodeRange.end = this.parser.endIndex
    elem.closeTagNameRange.start = this.parser.tagNameStartIndex
    elem.closeTagNameRange.end = this.parser.tagNameEndIndex
    elem.closeTagRange.start = this.parser.startIndex
    elem.closeTagRange.end = this.parser.endIndex

    if (this.elementCB) this.elementCB(elem)
  }

  public onopentag(name: string, attribs: { [key: string]: Attribute }): void {
    const type = ElementType.Tag
    const element = new Element(name, attribs, undefined, type)
    element.nodeRange.start = this.parser.startIndex
    element.openTagRange.start = this.parser.startIndex
    element.openTagRange.end = this.parser.endIndex
    element.openTagNameRange.start = this.parser.tagNameStartIndex
    element.openTagNameRange.end = this.parser.tagNameEndIndex
    this.addNode(element)
    this.tagStack.push(element)
  }

  public ontext(data: string): void {
    const { lastNode } = this

    if (!lastNode) {
      return
    }

    if (lastNode.type === ElementType.Text) {
      lastNode.data += data
      lastNode.nodeRange.end = this.parser.endIndex
      lastNode.dataRange.end = this.parser.endIndex
    } else {
      const text = new Text(data)
      text.nodeRange.start = this.parser.startIndex
      text.nodeRange.end = this.parser.endIndex
      text.dataRange.start = this.parser.startIndex
      text.dataRange.end = this.parser.endIndex
      this.addNode(text)
      this.lastNode = text
    }
  }

  public oncomment(data: string): void {
    if (this.lastNode && this.lastNode.type === ElementType.Comment) {
      this.lastNode.data += data
      this.lastNode.nodeRange.end = this.parser.endIndex
      this.lastNode.dataRange.end = this.parser.commentEndIndex
      return
    }

    const node = new Comment(data)
    node.nodeRange.start = this.parser.startIndex
    node.nodeRange.end = this.parser.endIndex
    node.dataRange.start = this.parser.commentStartIndex
    node.dataRange.end = this.parser.commentEndIndex
    this.addNode(node)
    this.lastNode = node
  }

  public oncommentend(): void {
    this.lastNode = null
  }

  public oncdatastart(): void {
    const text = new Text('')
    const node = new NodeWithChildren(ElementType.CDATA, [text])

    this.addNode(node)

    text.parent = node
    this.lastNode = text
  }

  public oncdataend(): void {
    this.lastNode = null
  }

  public onprocessinginstruction(name: string, data: string): void {
    const node = new ProcessingInstruction(name, data)
    this.addNode(node)
  }

  protected handleCallback(error: Error | null): void {
    if (typeof this.callback === 'function') {
      this.callback(error, this.dom)
    } else if (error) {
      throw error
    }
  }

  protected addNode(node: Node): void {
    const parent = this.tagStack[this.tagStack.length - 1]
    const previousSibling = parent.childNodes[parent.childNodes.length - 1] as Node | undefined

    parent.childNodes.push(node)

    if (previousSibling) {
      node.prev = previousSibling
      previousSibling.next = node
    }

    node.parent = parent
    this.lastNode = null
  }
}
