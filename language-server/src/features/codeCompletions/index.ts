import { Attribute, Element, Injectable, Text } from '@rwxml/analyzer'
import { CompletionList } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { completeAttribute } from './attribute'
import { completeDefName } from './defName'

export function codeCompletion(project: Project, uri: URI, position: Position): CompletionList {
  const xmlDocument = project.getXMLDocumentByUri(uri)
  const offset = project.rangeConverter.toOffset(position, uri.toString())

  if (xmlDocument && offset) {
    const targetNode = xmlDocument.findNodeAt(offset)
    const getStrAt = (offset: number) => {
      return offset >= 0 ? xmlDocument.rawText[offset] : String.fromCharCode(0)
    }

    if (targetNode instanceof Text) {
      const injectable = targetNode.parent as unknown
      if (injectable instanceof Injectable && injectable.contentRange?.include(offset)) {
        const completions = completeDefName(project, injectable)

        return {
          isIncomplete: true,
          items: completions,
        }
      }
    } else if (targetNode instanceof Injectable) {
      if (isPointingOpenTagName(targetNode, offset)) {
      } else if (isInsideOpenTag(targetNode, offset)) {
        // reference tag
      } else {
        const completions = completeAttribute(project, targetNode, offset)
        return {
          isIncomplete: true,
          items: completions,
        }
      }
    }
  }

  return {
    isIncomplete: false,
    items: [],
  }
}

function isPointingOpenTagName(node: Element, offset: number): boolean {
  return node.openTagNameRange.include(offset)
}

function isInsideOpenTag(node: Element, offset: number): boolean {
  return node.openTagRange.include(offset)
}
