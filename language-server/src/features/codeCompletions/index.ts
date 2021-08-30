import { Injectable, Text } from '@rwxml/analyzer'
import { CompletionList } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { CompleteAttribute } from './attribute'
import { completeDefName } from './defName'

export class CodeCompletion {
  private readonly completeAttribute = new CompleteAttribute()

  codeCompletion(project: Project, uri: URI, position: Position): CompletionList {
    const xmlDocument = project.getXMLDocumentByUri(uri)
    const offset = project.rangeConverter.toOffset(position, uri.toString())
    const ret: CompletionList = { isIncomplete: true, items: [] }

    if (!xmlDocument || !offset) {
      return ret
    }

    const targetNode = xmlDocument.findNodeAt(offset)
    if (!targetNode) {
      return ret
    }

    if (targetNode instanceof Text) {
      const injectable = targetNode.parent as unknown
      if (injectable instanceof Injectable && injectable.contentRange?.include(offset)) {
        const items = completeDefName(project, injectable)
        ret.items.push(...items)
      }
    }

    const attributes = this.completeAttribute.completeAttribute(project, targetNode, offset)
    ret.items.push(...attributes)

    return ret
  }
}
