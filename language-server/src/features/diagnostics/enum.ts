import { Document, Injectable } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { Project } from '../../project'
import jsonStr from '../../utils/json'
import { RangeConverter } from '../../utils/rangeConverter'
import { getNodesBFS, isLeafNode } from '../utils'
import { DiagnosticsContributor } from './contributor'

@tsyringe.injectable()
export class Enum implements DiagnosticsContributor {
  constructor(private readonly rangeConverter: RangeConverter) {}

  getDiagnostics(_: Project, document: Document): { uri: string; diagnostics: ls.Diagnostic[] } {
    const nodes = getNodesBFS(document)

    const typeNodes = AsEnumerable(nodes)
      .Where((node) => node instanceof Injectable)
      .Cast<Injectable>()
      // empty enum field have fieldInfo property, while <li>enum</li> doesn't.
      .Where((node) => node.typeInfo.isEnum && !node.fieldInfo && isLeafNode(node))
      .ToArray()

    const diagnostics = AsEnumerable(typeNodes)
      .Select((node) => this.diagnosisEnum(node))
      .Where((res) => res !== null)
      .Cast<ls.Diagnostic[]>()
      .SelectMany((x) => x)
      .ToArray()

    return {
      uri: document.uri,
      diagnostics,
    }
  }

  private diagnosisEnum(node: Injectable): ls.Diagnostic[] | null {
    const nodeRange = this.rangeConverter.toLanguageServerRange(node.nodeRange, node.document.uri)
    if (!nodeRange) {
      // TODO: print error
      return null
    }

    if (!node.contentRange) {
      return [
        {
          range: nodeRange,
          message: 'enum value cannot be empty.',
        },
      ]
    }

    const content = node.content
    const range = this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)
    if (!range || !content) {
      return null
    }

    const invalidEnums = content
      .split(',')
      .map((e) => e.trim())
      .filter((e) => !node.typeInfo.enums.includes(e))

    if (invalidEnums.length > 0) {
      return [
        {
          message: `Unknown enum value ${jsonStr(invalidEnums)}`,
          range,
          severity: ls.DiagnosticSeverity.Error,
        },
      ]
    }

    return null
  }
}
