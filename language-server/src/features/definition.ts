import { Injectable, Text } from '@rwxml/analyzer'
import { Connection, DefinitionLink } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import lsp from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../project'

type Result = {
  definitionLinks: DefinitionLink[]
  errors: any[]
}

export class Definition {
  private project: Project = void 0 as unknown as Project

  onDefinition(project: Project, uri: URI, position: Position): Result {
    const ret: Result = {
      definitionLinks: [],
      errors: [],
    }

    this.project = project

    const document = project.getXMLDocumentByUri(uri.toString())
    if (!document) {
      return ret
    }

    const offset = project.rangeConverter.toOffset(position, uri.toString())
    if (!offset) {
      return ret
    }

    const xmlDocument = project.getXMLDocumentByUri(uri)
    if (!xmlDocument) {
      return ret
    }

    const text = xmlDocument.findNodeAt(offset)
    const node = text?.parent as unknown
    if (node instanceof Injectable) {
      let defType: string | undefined = undefined
      let defName: string | undefined = undefined
      if (node.parentNode instanceof Injectable && node.parentNode.typeInfo.isEnumerable() && node.typeInfo.isDef()) {
        // when node is inside list node
        defType = node.typeInfo.getDefType()
        defName = node.content

        if (!(defType && defName)) {
          return ret
        }

        ret.definitionLinks.push(...this.getDefinitionLinksInsideListNode(defType, defName))
      } else if (node.fieldInfo?.fieldType.isDef()) {
        defType = node.fieldInfo.fieldType.getDefType()
        defName = node.content

        if (!(defType && defName)) {
          return ret
        }

        ret.definitionLinks.push(...this.getDefinitionLinks(defType, defName))
      }
    }

    return ret
  }

  private getDefinitionLinks(defType: string, defName: string): DefinitionLink[] {
    const links: DefinitionLink[] = []
    const defs = this.project.defManager.getDef(defType, defName)

    for (const def of defs) {
      const defNameNode = def.ChildElementNodes.find((node) => node.name === 'defName')
      const targetRange = this.project.rangeConverter.toLanguageServerRange(def.nodeRange, def.document.uri)

      if (!(defNameNode && targetRange)) {
        continue
      }

      const targetSelectionRange = this.project.rangeConverter.toLanguageServerRange(
        defNameNode.nodeRange,
        def.document.uri
      )
      if (!targetSelectionRange) {
        continue
      }

      links.push({
        targetRange,
        targetSelectionRange,
        targetUri: def.document.uri,
      })
    }

    return links
  }

  private getDefinitionLinksInsideListNode(defType: string, defName: string): DefinitionLink[] {
    const links: DefinitionLink[] = []
    const defs = this.project.defManager.getDef(defType, defName)

    for (const def of defs) {
      const defNameNode = def.ChildElementNodes.find((node) => node.name === 'defName')
      const targetRange = this.project.rangeConverter.toLanguageServerRange(def.nodeRange, def.document.uri)

      if (!(defNameNode && targetRange)) {
        continue
      }

      const targetSelectionRange = this.project.rangeConverter.toLanguageServerRange(
        defNameNode.nodeRange,
        def.document.uri
      )
      if (!targetSelectionRange) {
        continue
      }

      links.push({
        targetRange,
        targetSelectionRange,
        targetUri: def.document.uri,
      })
    }

    return links
  }
}
