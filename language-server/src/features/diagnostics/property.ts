import { Def, Document, Element, Node, TypedElement } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import winston from 'winston'
import { Project } from '../../project'
import { Configuration } from '../../configuration'
import defaultLogger, { withClass } from '../../log'
import { RangeConverter } from '../../utils/rangeConverter'
import { getRootElement } from '../utils'
import { DiagnosticsContributor } from './contributor'

/**
 * Field provides warning line
 */
@tsyringe.injectable()
export class Property implements DiagnosticsContributor {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(Property)),
    transports: [defaultLogger()],
  })

  constructor(
    private readonly rangeConverter: RangeConverter,
    private readonly configuration: Configuration
  ) {}

  async getDiagnostics(project: Project, document: Document): Promise<{ uri: string; diagnostics: ls.Diagnostic[] }> {
    const root = getRootElement(document)
    if (!root) {
      return { uri: document.uri, diagnostics: [] }
    }

    const liEnabled = (await this.configuration.get<any>({ section: 'rwxml.diagnostics.liError' }))?.enabled ?? false

    const elements = this.collectNonInjectedNodes(root)

    if (!elements || elements.length === 0) {
      return { uri: document.uri, diagnostics: [] }
    }

    this.log.info(`[${document.uri}] found ${elements.length} non-injected nodes (errors).`)

    const diagnostics = AsEnumerable(elements)
      .Select((node) => this.diagnosisInvalidField(node, liEnabled))
      .Where((res) => res !== null)
      .Cast<ls.Diagnostic[]>()
      .SelectMany((x) => x)
      .ToArray()

    return { uri: document.uri, diagnostics }
  }

  private diagnosisInvalidField(node: Element, liEnabled: boolean): ls.Diagnostic[] | null {
    if (node.tagName === 'li' && !liEnabled) {
      return null
    }

    const range = this.rangeConverter.toLanguageServerRange(node.nodeRange, node.document.uri)
    if (!range) {
      return null
    }

    const severity =
      node.tagName === 'li' ? ls.DiagnosticSeverity.Warning : ls.DiagnosticSeverity.Error

    return [
      {
        message: `Undefined property "${node.tagName}"`,
        range,
        severity,
      },
    ]
  }

  private collectNonInjectedNodes(node: Node): Element[] {
    const result: Element[] = []
    if (node instanceof Element) {
      this.collectNonInjectedNodesInternal(node, result)
    }

    return result
  }

  private collectNonInjectedNodesInternal(node: Element, out: Element[]): void {
    const typedNode = node as any

    // 检查是否有 typeInfo。注意：Defs 根节点本身没有 typeInfo 是正常的。
    if (node.name !== 'Defs' && !typedNode.typeInfo) {
      out.push(node)
      return
    }

    for (const childNode of node.ChildElementNodes) {
      this.collectNonInjectedNodesInternal(childNode, out)
    }
  }
}
