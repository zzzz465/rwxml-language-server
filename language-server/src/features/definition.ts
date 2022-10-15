import { Def, Document, Text, TypedElement } from '@rwxml/analyzer'
import { option } from 'fp-ts'
import { sequenceT } from 'fp-ts/lib/Apply'
import { flow } from 'fp-ts/lib/function'
import _ from 'lodash'
import { injectable } from 'tsyringe'
import { DefinitionLink, LocationLink } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { DefManager } from '../defManager'
import { Project } from '../project'
import { RangeConverter } from '../utils/rangeConverter'
import { getRootInProject } from './utils'
import { getDefNameOfGeneratedDef, isGeneratedDef } from './utils/def'
import { findNodeAt, getAttrib } from './utils/node'
import { getDefNameRange, rangeInclude, toAttribValueRange, toNodeRange, toRange } from './utils/range'

type Result = {
  definitionLinks: DefinitionLink[]
  errors: any[]
}

@injectable()
export class Definition {
  private readonly _toRange: ReturnType<typeof toRange>

  constructor(private readonly rangeConverter: RangeConverter) {
    this._toRange = toRange(rangeConverter)
  }

  onDefinition(project: Project, uri: URI, position: Position): Result {
    const offset = this.rangeConverter.toOffset(position, uri.toString())
    if (!offset) {
      return { definitionLinks: [], errors: [] }
    }

    return {
      definitionLinks: this.findDefinitionLinks(project, uri, offset),
      errors: [],
    }
  }

  findDefinitions(defManager: DefManager, document: Document, offset: number): Def[] {
    const node = document.findNodeAt(offset)
    if (!node) {
      return [] // TODO: return null
    }

    if (node instanceof Text && node.parent instanceof TypedElement && node.parent.typeInfo.isDef()) {
      // when cursor pointing text (referencing defName)
      const defType = node.parent.typeInfo.getDefType()
      let defName = node.data
      if (isGeneratedDef(defName)) {
        defName = getDefNameOfGeneratedDef(defName) ?? ''
      }

      return defManager.getDef(defType ?? '', defName)
    } else if (node instanceof Def) {
      // when cursor pointing "ParentName" attribute value
      const attrib = getAttrib('ParentName', node)
      if (option.isNone(attrib) || attrib.value.valueRange.include(offset)) {
        return []
      }

      return defManager.nameDatabase.getDef(null, attrib.value.value)
    } else {
      return []
    }
  }

  findDefinitionLinks(project: Project, uri: URI, offset: number): LocationLink[] {
    const getNodeAt = flow(getRootInProject, option.fromEither, option.chain(_.curry(findNodeAt)(offset)))
    const rangeIncludeOffset = _.curry(rangeInclude)(offset)

    const node = getNodeAt(project, uri)
    if (option.isNone(node)) {
      return []
    }

    if (node.value instanceof Text && node.value.parent instanceof TypedElement && node.value.parent.typeInfo.isDef()) {
      const defType = node.value.parent.typeInfo.getDefType() ?? ''
      let defName = node.value.data
      if (isGeneratedDef(defName)) {
        defName = getDefNameOfGeneratedDef(defName) ?? ''
      }

      return this.getDefNameDefinition(project, defType, defName)
    } else if (node.value instanceof Def) {
      const attrib = getAttrib('ParentName', node.value)
      if (option.isNone(attrib) || !rangeIncludeOffset(attrib.value.valueRange)) {
        return []
      }

      return this.getNameDefinition(project, attrib.value.value)
    } else {
      return []
    }
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
    const defs = project.defManager.nameDatabase.getDef(null, name)
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
