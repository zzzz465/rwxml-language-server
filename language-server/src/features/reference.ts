import { Element, Text } from '@rwxml/analyzer'
import { array, option } from 'fp-ts'
import { flow } from 'fp-ts/lib/function'
import _ from 'lodash'
import { juxt } from 'ramda'
import { injectable } from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { RangeConverter } from '../utils/rangeConverter'
import { getRootInProject } from './utils'
import { findNodeAt, getAttrib, isElement, isPointingDefNameContent, offsetInNodeAttribValue } from './utils/node'
import { toNodeRange, toRange } from './utils/range'

@injectable()
export class Reference {
  private readonly _toRange: ReturnType<typeof toRange>

  constructor(private readonly rangeConverter: RangeConverter) {
    this._toRange = toRange(rangeConverter)
  }

  onReference(project: Project, uri: URI, position: lsp.Position): lsp.Location[] {
    const functions = [this.onDefReference.bind(this), this.onNameReference.bind(this)]
    const getResults = flow(juxt(functions), array.flatten)

    return getResults(project, uri, position)
  }

  // TODO: seperate this to two methods, event handler and actual reference finder
  onDefReference(project: Project, uri: URI, position: lsp.Position): lsp.Location[] {
    const res: lsp.Location[] = []
    const offset = this.rangeConverter.toOffset(position, uri.toString())
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
        res.push(...this.findDefNameReferences(project, defName))
      }
    }

    return res
  }

  findDefReference(project: Project, node: Element | Text, offset: number) {
    if (node instanceof Text && isPointingDefNameContent(node, offset)) {
      const defName = node.data
      return this.findDefNameReferences(project, defName)
    }
  }

  private findDefNameReferences(project: Project, defName: string): lsp.Location[] {
    const nodes = project.defManager.getReferenceResolveWanters(defName)
    const res: lsp.Location[] = []

    for (const node of nodes) {
      if (!node.contentRange) {
        throw new Error(`node ${node.name} marked as defNameReference but contentRange is undefined.`)
      }

      const range = this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)

      if (range) {
        res.push({ range, uri: node.document.uri })
      }
    }

    return res
  }

  onNameReference(project: Project, uri: URI, position: lsp.Position): lsp.Location[] {
    const offset = this.rangeConverter.toOffset(position, uri.toString())
    if (!offset) {
      return []
    }

    // (project, uri) -> Option<Element>
    const getElement = flow(
      getRootInProject,
      option.fromEither,
      option.chain(_.curry(findNodeAt)(offset)),
      option.chain(option.fromPredicate(isElement))
    )

    const element = getElement(project, uri)
    if (option.isNone(element)) {
      return []
    }

    if (!offsetInNodeAttribValue(element.value, 'Name', offset)) {
      return []
    }

    const attrib = getAttrib('Name', element.value)
    if (option.isNone(attrib)) {
      return []
    }

    const resolveWanters = project.defManager.getInheritResolveWanters(attrib.value.value)
    const result: lsp.Location[] = []

    for (const node of resolveWanters) {
      const range = toNodeRange(this._toRange, node)
      if (option.isNone(range)) {
        continue
      }

      result.push({
        range: range.value,
        uri: uri.toString(),
      })
    }

    return result
  }
}
