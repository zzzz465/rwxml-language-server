import { URI } from 'vscode-uri'
import { Project } from '../project'
import * as lsp from 'vscode-languageserver'
import { Element, Injectable, Text } from '@rwxml/analyzer'
import { isPointingDefNameContent } from './utils/node'

export class Reference {
  // TODO: seperate this to two methods, event handler and actual reference finder
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

    if (isPointingDefNameContent(node, offset) && (node instanceof Element || node instanceof Text)) {
      const defName: string | undefined = node instanceof Text ? node.data : node.content
      if (defName) {
        res.push(...this.findDefNameReferences(project, defName, uri.toString()))
      }
    }

    return res
  }

  findDefReference(project: Project, node: Element | Text, offset: number) {
    if (isPointingDefNameContent(node, offset)) {
      const defName: string | undefined = node instanceof Text ? node.data : node.content
      if (defName) {
        res.push(...this.findDefNameReferences(project, defName, uri.toString()))
      }
    }

    return undefined
  }

  private findDefNameReferences(project: Project, defName: string, uri: string): lsp.Location[] {
    const nodes = project.defManager.getReferenceResolveWanters(defName)
    const res: lsp.Location[] = []

    for (const node of nodes) {
      if (!node.contentRange) {
        throw new Error(
          `node ${node.name} marked as defNameReference but contentRange is undefined. uri: ${decodeURIComponent(uri)}`
        )
      }

      const range = project.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)

      if (range) {
        res.push({ range, uri: node.document.uri })
      }
    }

    return res
  }
}
