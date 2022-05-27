import { Def, Document, Element, Injectable } from '@rwxml/analyzer'
import * as ls from 'vscode-languageserver'
import * as tsyringe from 'tsyringe'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { DiagnosticsContributor } from './contributor'
import { getNodesBFS } from '../utils/node'
import { AsEnumerable } from 'linq-es2015'
import winston from 'winston'
import defaultLogger, { className, logFormat } from '../../log'

/**
 * DuplicatedNode provides diagnostics against duplicated nodes
 */
@tsyringe.injectable()
export class DuplicatedNode implements DiagnosticsContributor {
  private log = winston.createLogger({
    format: winston.format.combine(className(DuplicatedNode), logFormat),
    transports: [defaultLogger()],
  })

  constructor(private readonly rangeConverter: RangeConverter) {}

  getDiagnostics(project: Project, document: Document): { uri: string; diagnostics: ls.Diagnostic[] } {
    const uri = document.uri
    const diagnostics: ls.Diagnostic[] = []
    const nodes = getNodesBFS(document)

    for (const node of nodes) {
      if (!(node instanceof Injectable || node instanceof Def)) {
        continue
      }

      const range = this.rangeConverter.toLanguageServerRange(node.nodeRange, uri)
      if (!range) {
        continue
      }

      const dupNodes = this.getDuplicatedNodes(node)
      diagnostics.push(...dupNodes.map((val) => this.makeDiagnosis(project, val.nodes)).flat())
    }

    return { uri, diagnostics }
  }

  /**
   * getDuplicatedNodes finds all duplicated element on single injectable.
   * @param node
   * @returns
   */
  getDuplicatedNodes(node: Def | Injectable): { tagName: string; nodes: Element[] }[] {
    if (node.typeInfo.isList() || node.typeInfo.isDictionary()) {
      return []
    }

    return AsEnumerable(node.ChildElementNodes)
      .GroupBy((x) => x.tagName)
      .Select((x) => {
        const tagName = x.key
        const nodes = [...x.values()]

        return { tagName, nodes }
      })
      .Where((x) => x.tagName != 'li' && x.nodes.length >= 2)
      .ToArray()
  }

  /**
   * make "duplicated nodes" diagnosis from given arguments.
   * @param project current project context.
   * @param nodes duplicated nodes. must have same tagName.
   */
  makeDiagnosis(project: Project, nodes: Element[]): ls.Diagnostic[] {
    if (nodes.length <= 0) {
      return []
    }

    const diagnostics: ls.Diagnostic[] = []

    const tagName = nodes[0].tagName

    for (const node of nodes) {
      const range = this.rangeConverter.toLanguageServerRange(node.nodeRange, node.document.uri)
      if (!range) {
        this.log.warn(
          `cannot convert range to ls.range. range: ${JSON.stringify(node.nodeRange)}, document: ${node.document.uri}`
        )
        continue
      }

      diagnostics.push({
        range,
        severity: ls.DiagnosticSeverity.Error,
        message: `Duplicated XML Node "${tagName}"`,
      })
    }

    return diagnostics
  }
}
