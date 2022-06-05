import { Def, Injectable, Text } from '@rwxml/analyzer'
import { option } from 'fp-ts'
import { sequenceT } from 'fp-ts/lib/Apply'
import { flow } from 'fp-ts/lib/function'
import _ from 'lodash'
import { injectable } from 'tsyringe'
import { DefinitionLink, LocationLink } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { RangeConverter } from '../utils/rangeConverter'
import { getRootInProject } from './utils'
import { getDefNameOfGeneratedDef, isGeneratedDef } from './utils/def'
import { findNodeAt, getAttrib, isNodeContainsDefReferenceText } from './utils/node'
import { getDefNameRange, rangeInclude, toAttribValueRange, toNodeRange, toRange } from './utils/range'

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

  findDefinitions(project: Project, uri: URI, offset: number): Def[] {
    const getNodeAt = flow(getRootInProject, option.fromEither, option.chain(_.curry(findNodeAt)(offset)))
    const rangeIncludeOffset = _.curry(rangeInclude)(offset)

    const node = getNodeAt(project, uri)
    if (option.isNone(node)) {
      return []
    }

    if (node.value instanceof Text && node.value.parent instanceof Injectable && node.value.parent.typeInfo.isDef()) {
      const defType = node.value.parent.typeInfo.getDefType()
      let defName = node.value.data
      if (isGeneratedDef(defName)) {
        defName = getDefNameOfGeneratedDef(defName) ?? ''
      }

      return option.getOrElse<Def[]>(() => [])(project.defManager.getDef(defType ?? '', defName))
    } else if (node.value instanceof Def) {
      const attrib = getAttrib('ParentName', node.value)
      if (option.isNone(attrib) || rangeIncludeOffset(attrib.value.valueRange)) {
        return []
      }

      return project.defManager.nameDatabase.getDef(attrib.value.value)
    } else {
      return []
    }
  }

  private getDefNameDefinition(project: Project, defType: string, defName: string): DefinitionLink[] {
    const defs = project.defManager.getDef(defType, defName)
    if (option.isNone(defs)) {
      return []
    }

    const links: DefinitionLink[] = []

    for (const def of defs.value) {
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
