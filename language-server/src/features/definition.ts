import { Def, Injectable, Text } from '@rwxml/analyzer'
import { DefinitionLink } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { getNodeAndOffset, isPointingDefNameContent, isPointingDefReferenceContent } from './utils/node'

type Result = {
  definitionLinks: DefinitionLink[]
  errors: any[]
}

interface DefReferenceText extends Text {
  parent: Injectable
}

export class Definition {
  onDefinition(project: Project, uri: URI, position: Position): Result {
    return {
      definitionLinks: this.findDefinition(project, uri, position),
      errors: [],
    }
  }

  findDefinition(project: Project, uri: URI, position: Position): DefinitionLink[] {
    const definitionTextNode = this.findDefinitionTextNode(project, uri, position)
    // is cursor is pointing definition?
    if (definitionTextNode) {
      let defType: string
      const defName = definitionTextNode.data
      if (definitionTextNode.parent.parent.typeInfo.isEnumerable() && definitionTextNode.parent.typeInfo.isDef()) {
        defType = definitionTextNode.parent.typeInfo.getDefType() ?? ''

        return this.getDefinitionLinksInsideListNode(project, defType, defName)
      } else if (definitionTextNode.parent.fieldInfo?.fieldType.isDef()) {
        defType = definitionTextNode.parent.fieldInfo.fieldType.getDefType() ?? ''

        return this.getDefinitionLinks(project, defType, defName)
      }
    }

    return []
  }

  findDefinitionTextNode(project: Project, uri: URI, position: Position): DefReferenceText | undefined {
    const data = getNodeAndOffset(project, uri, position)
    if (!data) {
      return
    }

    const { node, offset } = data
    if (isPointingDefReferenceContent(node, offset) || isPointingDefNameContent(node, offset)) {
      // is it refernced defName text? or defName text itself?
      return node as DefReferenceText
    }
  }

  private getDefinitionLinks(project: Project, defType: string, defName: string): DefinitionLink[] {
    const links: DefinitionLink[] = []
    const defs = project.defManager.getDef(defType, defName)

    for (const def of defs) {
      const defNameNode = def.ChildElementNodes.find((node) => node.name === 'defName')
      const targetRange = project.rangeConverter.toLanguageServerRange(def.nodeRange, def.document.uri)

      if (!(defNameNode && targetRange)) {
        continue
      }

      const targetSelectionRange = project.rangeConverter.toLanguageServerRange(defNameNode.nodeRange, def.document.uri)
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

  private getDefinitionLinksInsideListNode(project: Project, defType: string, defName: string): DefinitionLink[] {
    const links: DefinitionLink[] = []
    const defs = project.defManager.getDef(defType, defName)

    for (const def of defs) {
      const defNameNode = def.ChildElementNodes.find((node) => node.name === 'defName')
      const targetRange = project.rangeConverter.toLanguageServerRange(def.nodeRange, def.document.uri)

      if (!(defNameNode && targetRange)) {
        continue
      }

      const targetSelectionRange = project.rangeConverter.toLanguageServerRange(defNameNode.nodeRange, def.document.uri)
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
