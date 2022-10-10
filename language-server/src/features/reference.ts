import { Element, Range, Text } from '@rwxml/analyzer'
import { array, option } from 'fp-ts'
import { flow } from 'fp-ts/lib/function'
import _ from 'lodash'
import ono from 'ono'
import { juxt } from 'ramda'
import { injectable } from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import { DefManager } from '../defManager'
import defaultLogger, { withClass } from '../log'
import { Project } from '../project'
import { RangeConverter } from '../utils/rangeConverter'
import { getRootInProject } from './utils'
import { findNodeAt, getAttrib, isElement, isPointingDefNameContent, offsetInNodeAttribValue } from './utils/node'
import { toAttribValueRange, toRange } from './utils/range'

@injectable()
export class Reference {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(Reference)),
    transports: [defaultLogger()],
  })

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
        res.push(...(this.findDefReferenceWithLocation(project.defManager, node, offset) ?? []))
      }
    }

    return res
  }

  /**
   * find all def nodes that the offset text is referencing.
   * @param defManager
   * @param node the XML node that the offset text is in
   * @param offset current cursor offset
   * @returns
   */
  findDefReference(
    defManager: DefManager,
    node: Element | Text,
    offset: number
  ): { uri: string; range: Range }[] | null {
    if (!(node instanceof Text && isPointingDefNameContent(node, offset))) {
      return null
    }
    const defName = node.data

    const [ranges, errors] = this.findDefNameReferences(defManager, defName)
    if (errors.length > 0) {
      this.log.error(errors)
    }

    return ranges
  }

  findDefReferenceWithLocation(defManager: DefManager, node: Element | Text, offset: number): lsp.Location[] | null {
    const references = this.findDefReference(defManager, node, offset)
    if (!references) {
      return null
    }

    const lspRanges: lsp.Location[] = []
    const errors: Error[] = []

    for (const refr of references) {
      const range = this.rangeConverter.toLanguageServerRange(refr.range, refr.uri)
      if (!range) {
        errors.push(ono(`failed to convert range ${refr.range} to lsp range`))
      } else {
        lspRanges.push({ uri: refr.uri, range })
      }
    }

    if (errors.length > 0) {
      this.log.error(errors)
    }

    return lspRanges
  }

  private findDefNameReferences(defManager: DefManager, defName: string): [{ uri: string; range: Range }[], Error[]] {
    const nodes = defManager.getReferenceResolveWanters(defName)
    const ranges: { uri: string; range: Range }[] = []
    const errors: Error[] = []

    for (const node of nodes) {
      if (!node.contentRange) {
        errors.push(new Error(`node ${node} has no contentRange`))
      } else {
        ranges.push({ range: node.contentRange, uri: node.document.uri })
      }
    }

    return [ranges, errors]
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
      const range = toAttribValueRange(this._toRange, node, 'ParentName')
      if (option.isNone(range)) {
        continue
      }

      result.push({
        range: range.value,
        uri: node.document.uri,
      })
    }

    return result
  }
}
