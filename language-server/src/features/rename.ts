import { Injectable, Node, Text } from '@rwxml/analyzer'
import { Project } from '../project'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Reference } from './reference'
import { getNodeAndOffset, isPointingDefNameContent } from './utils/node'
import { DefaultDictionary } from 'typescript-collections'
import { AsEnumerable } from 'linq-es2015'
import { Definition } from './definition'

type Result = {
  [url: string]: lsp.TextEdit[]
}

export class Rename {
  constructor(private readonly reference: Reference, private readonly definition: Definition) {}

  rename(project: Project, uri: URI, newName: string, pos: lsp.Position): Result {
    const result: Result = {}

    // if file is not from workspace, then ignore.
    if (project.isDependencyFile(uri)) {
      return result
    }

    const data = getNodeAndOffset(project, uri, pos)
    if (!data) {
      return result
    }

    const definitionNode = this.definition.findDefinitionTextNode(project, uri, pos)
    if (!definitionNode) {
      return result
    }

    const definitionEditRange = project.rangeConverter.toLanguageServerRange(definitionNode.dataRange, uri.toString())
    if (!definitionEditRange) {
      return result
    }

    const referenceNodes = this.reference.findDefReference(project, definitionNode, data.offset)
    if (!referenceNodes) {
      return result
    }

    const dict = new DefaultDictionary<string, lsp.TextEdit[]>(() => [])

    // add definition edit
    dict.getValue(uri.toString()).push({ newText: newName, range: definitionEditRange })

    // add reference edits
    for (const ref of referenceNodes) {
      if (!project.isDependencyFile(ref.uri)) {
        dict.getValue(ref.uri).push({ newText: newName, range: ref.range })
      }
    }

    for (const key of dict.keys()) {
      result[key] = dict.getValue(key)
    }

    return result
  }
}