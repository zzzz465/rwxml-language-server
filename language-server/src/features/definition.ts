import { Def, Element, Injectable, Text } from '@rwxml/analyzer'
import { injectable } from 'tsyringe'
import { DefinitionLink, LocationLink } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { DefManager } from '../defManager'
import { Project } from '../project'
import { RangeConverter } from '../utils/rangeConverter'
import { getNodeAndOffset, isPointingDefNameContent, isPointingDefReferenceContent } from './utils/node'

type Result = {
  definitionLinks: DefinitionLink[]
  errors: any[]
}

interface DefReferenceText extends Text {
  parent: Injectable
}

@injectable()
export class Definition {
  constructor(private readonly rangeConverter: RangeConverter) {}

  onDefinition(project: Project, uri: URI, position: Position): Result {
    return {
      definitionLinks: this.findDefinitionLinks(project, uri, position),
      errors: [],
    }
  }

  findDefinitionLinks(project: Project, uri: URI, position: Position): LocationLink[] {
    const definitionTextNode = this.findDefinitionTextNode(project, uri, position)
    // is cursor is pointing definition?
    if (definitionTextNode) {
      const defName = definitionTextNode.data
      const defType = this.findDefType(definitionTextNode)
      if (!defType) {
        return []
      }

      return this.getDefinitionLinks(project, defType.value, defName)
    }

    return []
  }

  findDefs(project: Project, uri: URI, position: Position): Def[] {
    const definitionTextNode = this.findDefinitionTextNode(project, uri, position)
    if (!definitionTextNode) {
      return []
    }

    const defName = definitionTextNode.data
    const defType = this.findDefType(definitionTextNode)
    if (!defType) {
      return []
    }

    return project.defManager.getDef(defType.value, defName)
  }

  findDefType(node: DefReferenceText): { value: string; li?: boolean } | null {
    if (node.parent.parent.typeInfo.isEnumerable() && node.parent.typeInfo.isDef()) {
      const defType = node.parent.typeInfo.getDefType() ?? null

      return !!defType ? { value: defType, li: true } : null
    } else if (node.parent.fieldInfo?.fieldType.isDef()) {
      const defType = node.parent.typeInfo.getDefType() ?? null

      return !!defType ? { value: defType } : null
    }

    return null
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
      const targetRange = this.rangeConverter.toLanguageServerRange(def.nodeRange, def.document.uri)

      if (!(defNameNode && targetRange)) {
        continue
      }

      const targetSelectionRange = this.rangeConverter.toLanguageServerRange(defNameNode.nodeRange, def.document.uri)
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
