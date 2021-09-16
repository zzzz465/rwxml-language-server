import { URI } from 'vscode-uri'
import { Project } from '../project'
import * as lsp from 'vscode-languageserver'
import { Injectable, Text } from '@rwxml/analyzer'
import { isPointingDefNameContent } from './utils/node'

export class Reference {
  onReference(project: Project, uri: URI, position: lsp.Position): lsp.Location[] {
    const res: lsp.Location[] = []
    const offset = project.rangeConverter.toOffset(position, uri.toString())
    if (!offset) {
      return res
    }

    const document = project.getXMLDocumentByUri(uri)
    const node = document?.findNodeAt(offset)
    if (!(document && node)) {
      return res
    }

    if (isPointingDefNameContent(node) && node instanceof Text && node.parent instanceof Injectable) {
      const defName = node.parent.content
      if (defName) {
        res.push(...this.findDefNameReferences(project, defName, uri.toString()))
      }
    }

    return res
  }

  private findDefNameReferences(project: Project, defName: string, uri: string): lsp.Location[] {
    const nodes = project.defManager.getReferenceResolveWanters(defName)
    const res: lsp.Location[] = []

    for (const node of nodes) {
      const range = project.rangeConverter.toLanguageServerRange(node.nodeRange, uri)

      if (range) {
        res.push({ range, uri })
      }
    }

    return res
  }
}
