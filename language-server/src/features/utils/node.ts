import {
  Attribute,
  Comment,
  DataNode,
  Def,
  Document,
  Element,
  Node,
  NodeWithChildren,
  Text,
  TypedElement,
  isTag,
} from '@rwxml/analyzer'
import { array, either, option } from 'fp-ts'
import { filter, findFirst } from 'fp-ts/lib/Array'
import { flow, pipe } from 'fp-ts/lib/function'
import { AsEnumerable } from 'linq-es2015'
import _ from 'lodash'
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
    if (node.parent instanceof TypedElement && node.parent.name === 'defName' && node.parent.parent instanceof Def) {
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
    node.parent instanceof TypedElement &&
    (node.parent.parent instanceof TypedElement || node.parent.parent instanceof Def)
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
  if (!(node instanceof TypedElement)) {
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
  if (!(node instanceof Def || node instanceof TypedElement)) {
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

export function isPointingTypedElementTag(node: Node, offset: number): boolean {
  if (!(node instanceof TypedElement)) {
    return false
  }

  return node.openTagNameRange.include(offset) || node.closeTagNameRange.include(offset)
}

export function isOffsetOnOpenTag(node: Node, offset: number): boolean {
  if (!(node instanceof Element)) {
    return false
  }

  return node.openTagRange.include(offset)
}

export function isOffsetOnCloseTag(node: Node, offset: number): boolean {
  if (!(node instanceof Element)) {
    return false
  }

  return node.closeTagRange.include(offset)
}

export function makeTagNode(tag: string): string {
  return `<${tag}></${tag}>`
}

export function toLocation(converter: RangeConverter, node: Element | Text): lsp.Range | null {
  const range = converter.toLanguageServerRange(node.nodeRange, node.document.uri)
  return range
}

export function getNodeAndOffset(
  project: Project,
  uri: URI,
  position: lsp.Position
): { offset: number; document: Document; node: Node } | null {
  const rangeConverter = container.resolve(RangeConverter)

  const offset = rangeConverter.toOffset(position, uri.toString())
  const document = project.getXMLDocumentByUri(uri)

  if (!offset || !document) {
    return null
  }

  const node = document?.findNodeAt(offset)

  if (!node) {
    return null
  }

  return { offset, document, node }
}

export function isDefOrTypedElement(node: Node | null | undefined): node is Def | TypedElement {
  return !!node && (node instanceof Def || node instanceof TypedElement)
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
  while (doc.type !== 'root' && doc.parentNode) {
    doc = doc.parentNode
  }

  if (!doc || doc.type !== 'root') {
    return
  }

  return AsEnumerable((doc as any).childNodes).FirstOrDefault((x: any) => isTag(x)) as Element | undefined
}

export const isElement = (node: Node): node is Element => !!node && (node.type === 'tag' || node.type === 'script' || node.type === 'style')

export const isDef = (node: Node): node is Def => isElement(node) && 'getDefType' in node

export const childElements = (node: NodeWithChildren) => node.childNodes.filter(isElement)

/**
 * getDefsNode returns <Defs> node in document.
 */
export const getDefsNode = flow(
  childElements,
  findFirst((el) => el.name === 'Defs'),
  Result.fromOption(ono('cannot found <Defs> in document.'))
)

/**
 * getDefs returns Defs in document. like <ThingDef>, <DamageDef>, etc...
 */
export const getDefs = flow(getDefsNode, either.map(childElements), either.map(filter(isDef)))

export const getDefNameNode = (def: Def) =>
  pipe(
    def,
    childElements,
    array.findFirst((el) => el.name === 'defName')
  )

export const getContent = (el: Element) => pipe(el.content ?? null, option.fromNullable)

export const getDefNameStr = flow(getDefNameNode, option.chain(getContent))

// don't use ramda's curry. it doesn't do type inference.
export const getAttrib = _.curry((key: string, el: Element) => option.fromNullable(el.attribs[key]))

export const findNodeAt = (offset: number, node: Element) => pipe(node.findNodeAt(offset), option.fromNullable)

export const offsetInAttribName = (attrib: Attribute, offset: number) => attrib.nameRange.include(offset)

export const offsetInAttribValue = (attrib: Attribute, offset: number) => attrib.valueRange.include(offset)

/**
 * @returns check offset is included in given attribute's "Name" range
 */
export const offsetInNodeAttribName = (el: Element, attribName: string, offset: number) =>
  pipe(el, getAttrib(attribName), option.chain(option.fromPredicate(_.curryRight(offsetInAttribName)(offset))))

/**
 * @returns check offset is included in given attribute's "Value" range
 */
export const offsetInNodeAttribValue = (el: Element, attribName: string, offset: number) =>
  pipe(el, getAttrib(attribName), option.chain(option.fromPredicate(_.curryRight(offsetInAttribValue)(offset))))
