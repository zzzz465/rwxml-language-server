import { Def, Document, Element, Node, TypedElement } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { getRootElement } from '../utils'
import { DiagnosticsContributor } from './contributor'

/**
 * Field provides warning line
 */
@tsyringe.injectable()
export class Property implements DiagnosticsContributor {
  constructor(private readonly rangeConverter: RangeConverter) {}

  getDiagnostics(_: Project, document: Document): { uri: string; diagnostics: ls.Diagnostic[] } {
    const root = getRootElement(document)
    if (!root) {
      return { uri: document.uri, diagnostics: [] }
    }

    const elements = AsEnumerable(root.ChildElementNodes)
      .Select((x) => this.collectNonInjectedNodes(x))
      .Where((x) => x !== null)
      .Cast<Element[]>()
      .SelectMany((x) => x)
      .ToArray()

    if (!elements) {
      return { uri: document.uri, diagnostics: [] }
    }

    const diagnostics = AsEnumerable(elements)
      .Select((node) => this.diagnosisInvalidField(node))
      .Where((res) => res !== null)
      .Cast<ls.Diagnostic[]>()
      .SelectMany((x) => x)
      .ToArray()

    return { uri: document.uri, diagnostics }
  }

  private diagnosisInvalidField(node: Element): ls.Diagnostic[] | null {
    const range = this.rangeConverter.toLanguageServerRange(node.nodeRange, node.document.uri)
    if (!range) {
      return null
    }

    return [
      {
        message: `Undefined property "${node.tagName}"`,
        range,
        severity: ls.DiagnosticSeverity.Error,
      },
    ]
  }

  private collectNonInjectedNodes(node: Node): Element[] | null {
    const result: Element[] = []
    if (node instanceof Element) {
      this.collectNonInjectedNodesInternal(node, result)
    }

    return result
  }

  private collectNonInjectedNodesInternal(node: Element, out: Element[]): void {
    const isDefLike =
      node instanceof Def || (node.parent && node.parent instanceof Element && node.parent.tagName === 'Defs')
    if (isDefLike) {
      return
    }

    for (const childNode of node.ChildElementNodes) {
      if (childNode instanceof Element) {
        out.push(childNode)
      }

      if (childNode instanceof TypedElement) {
        this.collectNonInjectedNodesInternal(childNode, out)
      }
    }
  }
}
