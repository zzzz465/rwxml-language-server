import { Def, Element, Injectable, Node, Text } from '@rwxml/analyzer'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import * as lsp from 'vscode-languageserver'

export function isPointingContentOfNode(node: Node, offset: number): boolean {
  if (node instanceof Text && node.parent instanceof Element) {
    return node.parent.childNodes.length === 1
  } else if (node instanceof Element) {
    return node.childNodes.length === 0 && node.document.getCharAt(offset - 1) === '>'
  } else {
    return false
  }
}

// is cursor pointing defName content? (note: content not empty)
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

export function makeTagNode(tag: string): string {
  return `<${tag}></${tag}>`
}

export function toLocation(converter: RangeConverter, node: Element | Text) {
  const range = converter.toLanguageServerRange(node.nodeRange, node.document.uri)
  return range
}

export function getNodeAndOffset(project: Project, uri: URI, position: lsp.Position) {
  const offset = project.rangeConverter.toOffset(position, uri.toString())
  const document = project.getXMLDocumentByUri(uri)
  const node = 
}
