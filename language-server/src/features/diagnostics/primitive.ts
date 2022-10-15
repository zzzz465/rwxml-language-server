import { Document, TypedElement } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import winston from 'winston'
import defaultLogger, { withClass } from '../../log'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { getNodesBFS, isFloat, isInteger, isLeafNode } from '../utils'
import { DiagnosticsContributor } from './contributor'

/**
 * PrimitiveValue provides diagnosis for primitive nodes like integer, string, boolean, etc.
 * @todo refactor code to use consumer(contributor?) pattern
 */
@tsyringe.injectable()
export class PrimitiveValue implements DiagnosticsContributor {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(PrimitiveValue)),
    transports: [defaultLogger()],
  })

  constructor(private readonly rangeConverter: RangeConverter) {}

  getDiagnostics(_: Project, document: Document): { uri: string; diagnostics: ls.Diagnostic[] } {
    // 1. find all TypedElementleaf nodes
    const nodes = getNodesBFS(document)

    // 2. check type is primitive type
    const primitiveNodes = AsEnumerable(nodes)
      .Where((node) => node instanceof TypedElement)
      .Cast<TypedElement>()
      .Where((node) => isLeafNode(node))
      .ToArray()

    // 3. send diagnosis
    const diagnostics = AsEnumerable(primitiveNodes)
      .Select((node) => this.diagnosisPrimitveNodes(node))
      .Where((result) => result !== null)
      .Cast<ls.Diagnostic[]>()
      .SelectMany((x) => x)
      .ToArray()

    return {
      uri: document.uri,
      diagnostics: diagnostics,
    }
  }

  private diagnosisPrimitveNodes(node: TypedElement): ls.Diagnostic[] | null {
    const text = node.content
    if (!text || !node.contentRange) {
      return null
    }

    const textRange = this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)
    if (!textRange) {
      return null
    }

    const diagnostics: ls.Diagnostic[] = []

    if (node.typeInfo.isInteger()) {
      diagnostics.push(...(this.diagnosisInt(text, textRange) ?? []))
    } else if (node.typeInfo.isBoolean()) {
      diagnostics.push(...(this.diagnosisBool(text, textRange) ?? []))
    } else if (node.typeInfo.isString() && !node.parent.typeInfo.isGeneric) {
      // ignore if LIst<string>
      diagnostics.push(...(this.diagnosisString(text, textRange) ?? []))
    } else if (node.typeInfo.isFloat()) {
      diagnostics.push(...(this.diagnosisFloat(text, textRange) ?? []))
    }

    return diagnostics
  }

  private diagnosisInt(text: string, range: ls.Range): ls.Diagnostic[] | null {
    if (isInteger(text)) {
      return null
    }

    if (isFloat(text)) {
      return [
        {
          range,
          message: `Floating point value "${text}" will be parsed as integer.`,
          severity: ls.DiagnosticSeverity.Warning,
        },
      ]
    }

    return [
      {
        range,
        message: `Invalid value "${text}" for integer type.`,
        severity: ls.DiagnosticSeverity.Error,
      },
    ]
  }

  private diagnosisBool(text: string, range: ls.Range): ls.Diagnostic[] | null {
    switch (text.toLowerCase()) {
      case 'true':
      case 'false':
        return null

      default:
        break
    }

    return [
      {
        range,
        message: `Invalid value "${text}" for boolean type.`,
        severity: ls.DiagnosticSeverity.Error,
      },
    ]
  }

  private diagnosisString(text: string, range: ls.Range): ls.Diagnostic[] | null {
    if (text.startsWith(' ') || text.endsWith(' ')) {
      return [
        {
          range,
          message: 'text value has preceding/trailing whitespace.',
          severity: ls.DiagnosticSeverity.Warning,
        },
      ]
    }

    return null
  }

  private diagnosisFloat(text: string, range: ls.Range): ls.Diagnostic[] | null {
    if (!isFloat(text)) {
      return [
        {
          range,
          message: `Invalid value ${text} for float type.`,
          severity: ls.DiagnosticSeverity.Error,
        },
      ]
    }

    return null
  }
}
