import { Document, Injectable } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { Project } from '../../project'
import { DiagnosticsContributor } from './contributor'
import winston from 'winston'
import { AsEnumerable } from 'linq-es2015'
import { getNodesBFS, isFloat, isInteger, isLeafNode } from '../utils'
import { RangeConverter } from '../../utils/rangeConverter'
import defaultLogger, { className, logFormat } from '../../log'

/**
 * PrimitiveValue provides diagnosis for primitive nodes like integer, string, boolean, etc.
 * @todo refactor code to use consumer(contributor?) pattern
 */
@tsyringe.injectable()
export class PrimitiveValue implements DiagnosticsContributor {
  private log = winston.createLogger({
    format: winston.format.combine(className(PrimitiveValue), logFormat),
    transports: [defaultLogger()],
  })

  constructor(private readonly rangeConverter: RangeConverter) {}

  getDiagnostics(_: Project, document: Document): { uri: string; diagnostics: ls.Diagnostic[] } {
    // 1. find all Injectable leaf nodes
    const nodes = getNodesBFS(document)

    // 2. check type is primitive type
    const primitiveNodes = AsEnumerable(nodes)
      .Where((node) => node instanceof Injectable)
      .Cast<Injectable>()
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

  private diagnosisPrimitveNodes(node: Injectable): ls.Diagnostic[] | null {
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
