import { Injectable, Text } from '@rwxml/analyzer'
import { CompletionList } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { CompleteAttribute } from './attribute'
import { DefNameCompletion } from './defName'
import { OpenTagCompletion } from './opentag'
import { ResourcePath } from './resourcePath'

export class CodeCompletion {
  private readonly completeAttribute = new CompleteAttribute()
  private readonly openTagCompletion = new OpenTagCompletion()
  private readonly resourcePathCompletion = new ResourcePath()
  private readonly defNameCompletion = new DefNameCompletion()

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

    const openTagCompletions = this.openTagCompletion.complete(project, targetNode, offset)
    ret.items.push(...openTagCompletions)
    const attributes = this.completeAttribute.completeAttribute(project, targetNode, offset)
    ret.items.push(...attributes)
    const resourcePaths = this.resourcePathCompletion.complete(project, targetNode, offset)
    ret.items.push(...resourcePaths)
    const defNames = this.defNameCompletion.complete(project, targetNode, offset)
    ret.items.push(...defNames)

    return ret
  }
}
