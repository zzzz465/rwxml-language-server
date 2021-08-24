import { Injectable } from '@rwxml/analyzer'
import { CompletionList } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { Range } from '../../utils'
import { completeDefName } from './defName'

export function codeCompletion(project: Project, uri: URI, position: Position): CompletionList {
  const xmlDocument = project.getXMLDocumentByUri(uri)
  const offset = project.rangeConverter.toOffset(position, uri.toString())

  if (xmlDocument && offset) {
    const targetNode = xmlDocument.findNodeAt(offset)

    if (
      targetNode instanceof Injectable && // <tag></tag> <- content is null
      (targetNode.content === null || Range.includes(targetNode.contentRange, offset))
    ) {
      const completions = completeDefName(project, targetNode)

      return {
        isIncomplete: true,
        items: completions,
      }
    }
  }

  return {
    isIncomplete: false,
    items: [],
  }
}
