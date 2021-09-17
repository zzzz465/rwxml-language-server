import { Injectable, Node, Text } from '@rwxml/analyzer'
import { Project } from '../project'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Reference } from './reference'

type Result = {
  [url: string]: lsp.TextEdit[]
}

export class Rename {
  constructor(private readonly reference: Reference) {}

  rename(project: Project, uri: URI, newName: string, position: lsp.Position): Result {
    const result: Result = {}

    const references = this.reference.onReference(project, uri, position)

    for (const reference of references) {
      const offset = 
      const xmlNode = project.getXMLDocumentByUri(reference.uri)

      if (!xmlNode)
    }

    return result
  }
}
