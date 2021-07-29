import { createScanner } from './XMLScanner'
import { findFirst } from '../utils/arrays'
import { TokenType } from './TokenType'

export interface textRange {
  start: number
  end: number
  content: string
}

export class Node {
  public tag?: textRange // <|Defs| ...>
  public closed = false // is validate closed? ex) <tag></tag>
  public startTagEnd: number | undefined
  public endTagStart: number | undefined
  public attributes: { [name: string]: string | null } = {}
  public contentRange?: textRange
  public document!: XMLDocument
  public start!: number
  public end!: number
  public children!: Node[]
  public parent?: Node

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public get attributeNames(): string[] {
    return this.attributes ? Object.keys(this.attributes) : []
  }

  public get firstChild(): Node | undefined {
    return this.children[0]
  }

  public get lastChild(): Node | undefined {
    return this.children.length ? this.children[this.children.length - 1] : void 0
  }

  get endTag(): textRange | undefined {
    if (this.closed && this.tag && this.endTagStart) {
      return {
        content: this.tag.content,
        start: this.endTagStart + 2, // </ = 2개
        end: this.end - 1,
      }
    } else {
      return undefined
    }
  }

  public isSameTag(tagString: string): boolean {
    return !!this.tag && this.tag.content === tagString
  }

  public findNodeBefore(offset: number): Node {
    const idx = findFirst(this.children, (c) => offset <= c.start) - 1
    if (idx >= 0) {
      const child = this.children[idx]
      if (offset > child.start) {
        if (offset < child.end) {
          return child.findNodeBefore(offset)
        }
        const lastChild = child.lastChild
        if (lastChild && lastChild.end === child.end) {
          return child.findNodeBefore(offset)
        }
        return child
      }
    }
    return this
  }

  public findNodeAt(offset: number): Node {
    const idx = findFirst(this.children, (c) => offset <= c.start) - 1
    if (idx >= 0) {
      const child = this.children[idx]
      if (offset > child.start && offset <= child.end) {
        return child.findNodeAt(offset)
      }
    }
    return this
  }
}

export interface XMLDocument extends Node {
  Uri: string
  rawXmlDefinition: string
  root?: Node

  findNodeBefore(offset: number): Node

  findNodeAt(offset: number): Node
}

function createNode(fields: Partial<Node>) {
  return Object.assign(Node.constructor.call(new Object(null)), fields)
}

export function parse(rawXML: string): XMLDocument {
  const scanner = createScanner(rawXML, undefined, undefined, true)

  const xmlDocument = createNode({
    document: void 0,
    start: 0,
    end: rawXML.length,
    children: [],
    parent: void 0,
  }) as XMLDocument
  xmlDocument.document = xmlDocument
  let curr = xmlDocument as Node
  let endTagStart = -1
  let endTagName: string | null = null
  let pendingAttribute: string | null = null
  let token = scanner.scan()
  while (token !== TokenType.EOS) {
    switch (token) {
      case TokenType.XMLDeclaration: {
        xmlDocument.rawXmlDefinition = scanner.getTokenText()
        break
      }
      case TokenType.StartTagOpen: {
        const child = createNode({
          document: xmlDocument,
          start: scanner.getTokenOffset(),
          end: rawXML.length,
          children: [],
          parent: curr,
        })
        child.document = xmlDocument
        curr.children.push(child)
        curr = child
        break
      }
      case TokenType.StartTag: {
        curr.tag = {
          content: scanner.getTokenText(),
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd(),
        }
        break
      }
      case TokenType.StartTagClose: {
        if (curr.parent) {
          curr.end = scanner.getTokenEnd() // might be later set to end tag position
          if (scanner.getTokenLength()) {
            curr.startTagEnd = scanner.getTokenEnd()
          }
        }
        break
      }
      case TokenType.StartTagSelfClose: {
        if (curr.parent) {
          curr.closed = true
          curr.end = scanner.getTokenEnd()
          curr.startTagEnd = scanner.getTokenEnd()
          curr = curr.parent
        }
        break
      }
      case TokenType.EndTagOpen: {
        endTagStart = scanner.getTokenOffset()
        endTagName = null
        break
      }
      case TokenType.EndTag: {
        endTagName = scanner.getTokenText()
        break
      }
      case TokenType.EndTagClose: {
        if (endTagName) {
          let node = curr
          // see if we can find a matching
          while (!node.isSameTag(endTagName) && node.parent) {
            node = node.parent
          }
          if (node.parent) {
            // match

            while (curr !== node) {
              curr.end = endTagStart
              curr.closed = false
              curr = curr.parent!
            }

            curr.closed = true
            curr.endTagStart = endTagStart
            curr.end = scanner.getTokenEnd()
            curr = curr.parent!
          } else {
            // ignore closing tag </tag>
          }
        }
        break
      }
      case TokenType.AttributeName: {
        pendingAttribute = scanner.getTokenText()
        let attributes = curr.attributes
        if (!attributes) {
          curr.attributes = attributes = {}
        }
        attributes[pendingAttribute] = null // Support valueless attributes such as 'checked'
        break
      }
      case TokenType.AttributeValue: {
        let value = scanner.getTokenText()
        if (value.length >= 2) value = value.substring(1, value.length - 1) // remove encapsuling text '' or ""
        const attributes = curr.attributes
        if (attributes && pendingAttribute) {
          attributes[pendingAttribute] = value
          pendingAttribute = null
        }
        break
      }
      case TokenType.Content: {
        curr.contentRange = {
          start: scanner.getTokenOffset(),
          content: scanner.getTokenText(),
          end: scanner.getTokenEnd(),
        }
        break
      }
    }
    token = scanner.scan()
  }

  const queue: Node[] = [xmlDocument]
  while (queue.length > 0) {
    // node that have children can't have text value
    const item = queue.pop()! // so it removes them
    if (item.children.length > 0) {
      delete item.contentRange
      queue.push(...item.children)
    }
  }

  if (xmlDocument.children.length > 0) xmlDocument.root = xmlDocument.children[0]

  return xmlDocument
}
