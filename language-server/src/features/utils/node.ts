import { Comment, DataNode, Def, Document, Element, Injectable, Node, NodeWithChildren, Text } from '@rwxml/analyzer'
import fp from 'fp-ts'
import { filter, findFirst } from 'fp-ts/lib/Array'
import { AsEnumerable } from 'linq-es2015'
import ono from 'ono'
import { container } from 'tsyringe'
import { Queue } from 'typescript-collections'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { Result } from '../../utils/functional/result'
import { RangeConverter } from '../../utils/rangeConverter'

export function isPointingContentOfNode(node: Node, offset: number): boolean {
  if (node instanceof Text && node.parent instanceof Element) {
    return node.parent.childNodes.length === 1
  } else if (node instanceof Element) {
    return node.childNodes.length === 0 && node.document.getCharAt(offset - 1) === '>'
  } else {
    return false
  }
}

// is cursor pointing Def.defName content? (note: content not empty)
// TODO: check empty content when offset is provided
export function isPointingDefNameContent(node: Node, offset?: number): boolean {
  if (node instanceof Text) {
    if (node.parent instanceof Injectable && node.parent.name === 'defName' && node.parent.parent instanceof Def) {
      return true
    }
  } else if (offset !== undefined) {
    if (node instanceof Element && node.name === 'defName') {
      if (node.contentRange) {
        return node.contentRange.include(offset)
      } else {
        return offset === node.openTagRange.end + 1
      }
    }
  }

  return false
}

/**
 * isDefRefContent checks node is TextNode and the content references def.
 * @param node
 * @returns
 */
export function isTextReferencingDef(node: Node): node is Text {
  if (
    node instanceof Text &&
    node.parent instanceof Injectable &&
    (node.parent.parent instanceof Injectable || node.parent.parent instanceof Def)
  ) {
    if (node.parent.parent.typeInfo.isList() && node.parent.typeInfo.isDef()) {
      // if node is child of list node
      return true
    } else if (node.parent.fieldInfo?.fieldType.isDef()) {
      return true
    }
  }

  return false
}

/**
 * isNodeContainsDefReferenceText checks a given node only have a text node that references def.
 * @param node
 * @returns
 */
export function isNodeContainsDefReferenceText(node: Node): boolean {
  if (!(node instanceof Injectable)) {
    return false
  }

  if (!node.typeInfo.isDef()) {
    return false
  }

  if (node.childNodes.length !== 1) {
    return false
  }

  return true
}

export function isPointingParentNameAttributeValue(node: Node, offset: number): boolean {
  if (!(node instanceof Def || node instanceof Injectable)) {
    return false
  }

  for (const attrib of node.attributes) {
    if (attrib.name !== 'ParentName') {
      continue
    }

    if (attrib.valueRange.include(offset)) {
      return true
    }
  }

  return false
}

export function isPointingInjectableTag(node: Node, offset: number): boolean {
  if (!(node instanceof Injectable)) {
    return false
  }

  return node.openTagNameRange.include(offset) || node.closeTagNameRange.include(offset)
}

export function makeTagNode(tag: string): string {
  return `<${tag}></${tag}>`
}

export function toLocation(converter: RangeConverter, node: Element | Text) {
  const range = converter.toLanguageServerRange(node.nodeRange, node.document.uri)
  return range
}

export function getNodeAndOffset(project: Project, uri: URI, position: lsp.Position) {
  const rangeConverter = container.resolve(RangeConverter)

  const offset = rangeConverter.toOffset(position, uri.toString())
  const document = project.getXMLDocumentByUri(uri)

  if (!offset || !document) {
    return
  }

  const node = document?.findNodeAt(offset)

  if (!node) {
    return
  }

  return { offset, document, node }
}

export function isDefOrInjectable(node: Node | null | undefined): node is Def | Injectable {
  return !!node && (node instanceof Def || node instanceof Injectable)
}

/**
 * 1. text node and opening a tag eg. <foo> <| </foo>
 * 2. element and selecting a opening tag name <s|ome...
 */
export function isPointingOpenTagName(node: Element | Text, offset: number): boolean {
  if (node instanceof Text) {
    const localOffset = offset - node.dataRange.start - 1
    const beforeCursor = node.data.charAt(localOffset)

    return beforeCursor === '<'
  } else {
    return node.openTagNameRange.include(offset)
  }
}

export function getNodesBFS(doc: Document): Node[] {
  const nodes: Node[] = []
  const queue = new Queue<Node>()

  queue.enqueue(doc)
  while (queue.size() > 0) {
    const node = queue.dequeue() as Node

    if (node instanceof NodeWithChildren) {
      for (const child of node.childNodes) {
        queue.enqueue(child)
      }
    }

    nodes.push(node)
  }

  return nodes
}

/**
 * check node only contains text node as chlidren (except comment, data tag)
 * NOTE: node's isLeafNode() checks node is leaf in context of node tree. which means usually Text node.
 * @param node
 */
export function isLeafNode(node: Node): boolean {
  if (!(node instanceof NodeWithChildren)) {
    return false
  }

  const containsNonLeafNodeContent = node.childNodes.some(isNonLeafContent)

  return !containsNonLeafNodeContent
}

/**
 * check node type is anything but Text, Comment, DataNode
 * @param node
 * @returns
 */
export function isNonLeafContent(node: Node): boolean {
  if (!(node instanceof NodeWithChildren)) {
    return false
  }

  if (node instanceof Text) {
    return false
  } else if (node instanceof Comment) {
    return false
  } else if (node instanceof DataNode) {
    return false
  }

  return true
}

export function getRootElement(node: Node): Element | undefined {
  let doc: Node = node
  while (!(doc instanceof Document) && doc.parentNode) {
    doc = doc.parentNode
  }

  if (!doc || !(doc instanceof Document)) {
    return
  }

  return AsEnumerable(doc.childNodes).FirstOrDefault((x) => x instanceof Element) as Element | undefined
}

export const isElement = (node: Node): node is Element => node instanceof Element || node instanceof Def

export const isDef = (node: Node): node is Def => node instanceof Def

export const childElements = (node: NodeWithChildren) => node.childNodes.filter(isElement)

/**
 * getDefsNode returns <Defs> node in document.
 */
export const getDefsNode = fp.function.flow(
  childElements,
  findFirst((el) => el.name === 'Defs'),
  Result.fromOption(ono('cannot found <Defs> in document.'))
)

/**
 * getDefs returns Defs in document. like <ThingDef>, <DamageDef>, etc...
 */
export const getDefs = fp.function.flow(getDefsNode, fp.either.map(childElements), fp.either.map(filter(isDef)))

export const getDefNameNode = (def: Def) =>
  fp.function.pipe(
    def,
    childElements,
    fp.array.findFirst((el) => el.name === 'defName')
  )

export const getContent = (el: Element) => fp.function.pipe(el.content ?? null, fp.option.fromNullable)

export const getDefNameStr = fp.function.flow(getDefNameNode, fp.option.chain(getContent))
