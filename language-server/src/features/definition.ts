import { Def, Injectable, Node, Text } from '@rwxml/analyzer'
import { option } from 'fp-ts'
import { sequenceT } from 'fp-ts/lib/Apply'
import { injectable } from 'tsyringe'
import { DefinitionLink, LocationLink } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { RangeConverter } from '../utils/rangeConverter'
import { getDefNameOfGeneratedDef, isGeneratedDef } from './utils/def'
import {
  getNodeAndOffset,
  isNodeContainsDefReferenceText,
  isPointingDefNameContent,
  isTextReferencingDef,
} from './utils/node'
import { getDefNameRange, toAttribValueRange, toNodeRange, toRange } from './utils/range'

type Result = {
  definitionLinks: DefinitionLink[]
  errors: any[]
}

/**
 * DefReferenceTextNode represents TextNode that value is referencing a def.
 * @todo refactor this
 */
interface DefRefTextNode extends Text {
  parent: Injectable
}

@injectable()
export class Definition {
  private readonly _toRange: ReturnType<typeof toRange>

  constructor(private readonly rangeConverter: RangeConverter) {
    this._toRange = toRange(rangeConverter)
  }

  onDefinition(project: Project, uri: URI, position: Position): Result {
    return {
      definitionLinks: this.findDefinitionLinks(project, uri, position),
      errors: [],
    }
  }

  findDefinitionLinks(project: Project, uri: URI, position: Position): LocationLink[] {
    const definitionTextNode = this.findDefRefTextNode(project, uri, position)
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

  /**
   * find all Def from given position. only works when position is Text node
   * @param project
   * @param uri
   * @param position
   * @returns
   */
  findDefsFromUriWithPos(project: Project, uri: URI, offset: number): Def[]
  findDefsFromUriWithPos(project: Project, uri: URI, position: Position): Def[]
  findDefsFromUriWithPos(project: Project, uri: URI, positionOrOffset: any): Def[] {
    const refNode = this.findDefRefTextNode(project, uri, positionOrOffset)
    if (!refNode) {
      return []
    }

    return this.findDefsFromDefRefTextNode(project, refNode) ?? []
  }

  /**
   * findReferencingDefsFromInjectable returns refrencing defs from given injectable node.
   * @param project the project context.
   * @param node the leaf injectable node that have text node as a children.
   * @returns array of defs that this node is referencing. null if the node is not a leaf node.
   */
  findReferencingDefsFromInjectable(project: Project, node: Injectable): Def[] | null {
    if (!isNodeContainsDefReferenceText(node)) {
      return null
    } else if (!node.content) {
      return null
    }

    const defName = (() => {
      if (isGeneratedDef(node.content)) {
        return getDefNameOfGeneratedDef(node.content)
      } else {
        return node.content
      }
    })()
    const defType = node.typeInfo.getDefType()
    if (!defName || !defType) {
      return null
    }

    const res = project.defManager.getDef(defType, defName)
    if (res === 'DEFTYPE_NOT_EXIST') {
      return []
    } else {
      return res
    }
  }

  findDefsFromDefRefTextNode(project: Project, refNode: DefRefTextNode): Def[] | null {
    return this.findReferencingDefsFromInjectable(project, refNode.parent)
  }

  findDefType(node: DefRefTextNode): { value: string; li?: boolean } | null {
    if (node.parent.parent.typeInfo.isList() && node.parent.typeInfo.isDef()) {
      const defType = node.parent.typeInfo.getDefType() ?? null

      return defType ? { value: defType, li: true } : null
    } else if (node.parent.fieldInfo?.fieldType.isDef()) {
      const defType = node.parent.typeInfo.getDefType() ?? null

      return defType ? { value: defType } : null
    }

    return null
  }

  findDefRefTextNode(project: Project, uri: URI, offset: number): DefRefTextNode | undefined
  findDefRefTextNode(project: Project, uri: URI, position: Position): DefRefTextNode | undefined
  findDefRefTextNode(project: Project, uri: URI, positionOrOffset: Position | number): DefRefTextNode | undefined {
    let node: Node
    let offset: number
    if (typeof positionOrOffset === 'object') {
      const temp = getNodeAndOffset(project, uri, positionOrOffset)
      if (!temp) {
        return
      }

      node = temp.node
      offset = temp.offset
    } else {
      const temp = project.getXMLDocumentByUri(uri)?.findNodeAt(positionOrOffset)
      if (!temp) {
        return
      }

      node = temp
      offset = positionOrOffset
    }

    if (isTextReferencingDef(node) || isPointingDefNameContent(node, offset)) {
      // is it refernced defName text? or defName text itself?
      return node as DefRefTextNode
    }
  }

  private getDefinitionLinks(project: Project, defType: string, defName: string): DefinitionLink[] {
    const links: DefinitionLink[] = []
    const getDefsRes = project.defManager.getDef(defType, defName)

    if (getDefsRes === 'DEFTYPE_NOT_EXIST') {
      return []
    }

    const defs = getDefsRes

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

  private getDefNameDefinition(project: Project, defType: string, defName: string): DefinitionLink[] {
    const defs = project.defManager.getDef(defType, defName)
    const links: DefinitionLink[] = []

    for (const def of defs) {
      const res = sequenceT(option.Apply)(getDefNameRange(this._toRange, def), toNodeRange(this._toRange, def))
      if (option.isNone(res)) {
        continue
      }

      const [targetSelectionRange, targetRange] = res.value
      const uri = def.document.uri

      // 1. highlight range
      // 2. selection range
      // 3. document uri
      links.push({
        targetRange,
        targetSelectionRange,
        targetUri: uri,
      })
    }

    return links
  }

  private getNameDefinition(project: Project, name: string): DefinitionLink[] {
    const defs = project.defManager.getInheritResolveWanters(name)
    const links: DefinitionLink[] = []

    for (const def of defs) {
      const res = sequenceT(option.Apply)(
        toAttribValueRange(this._toRange, def, 'Name'),
        toNodeRange(this._toRange, def)
      )
      if (option.isNone(res)) {
        continue
      }

      const [targetSelectionRange, targetRange] = res.value
      const uri = def.document.uri

      // 1. highlight range
      // 2. selection range
      // 3. document uri
      links.push({
        targetRange,
        targetSelectionRange,
        targetUri: uri,
      })
    }

    return links
  }
}
