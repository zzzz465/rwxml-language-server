import { Injectable, Text } from '@rwxml/analyzer'
import { CompletionList } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { completeDefName } from './defName'

export function codeCompletion(project: Project, uri: URI, position: Position): CompletionList {
  const xmlDocument = project.getXMLDocumentByUri(uri)
  const offset = project.rangeConverter.toOffset(position, uri.toString())

  if (xmlDocument && offset) {
    const targetNode = xmlDocument.findNodeAt(offset)

    if (targetNode instanceof Text) {
      const injectable = targetNode.parent as unknown
      if (injectable instanceof Injectable && injectable.contentRange?.include(offset)) {
        const completions = completeDefName(project, injectable)

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
