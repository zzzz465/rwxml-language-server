import { Document, Injectable } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import winston from 'winston'
import { AsEnumerable } from 'linq-es2015'
import { Diagnostic } from 'vscode-languageserver'
import { isInteger } from 'lodash'
import { LogToken } from '../../../log'
import { Project } from '../../../project'
import { RangeConverter } from '../../../utils/rangeConverter'
import { getNodesBFS, isLeafNode, isFloat } from '../../utils'
import { DiagnosticsContributor } from '../contributor'

/**
 * PrimitiveValue provides diagnosis for primitive nodes like integer, string, boolean, etc.
 * @todo refactor code to use consumer(contributor?) pattern
 */
@tsyringe.injectable()
export class PrimitiveValue implements DiagnosticsContributor {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${PrimitiveValue.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(private readonly rangeConverter: RangeConverter, @tsyringe.inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  getDiagnostics(_: Project, document: Document): { uri: string; diagnostics: ls.Diagnostic[] } {
    // 1. find all Injectable leaf nodes
    const nodes = getNodesBFS(document)

    // 2. check type is primitive type
    const primitiveNodes = AsEnumerable(nodes)
      .Where((node) => node instanceof Injectable)
      .Cast<Injectable>()
      .Where((node) => isLeafNode(node))
      .Where((node) => this.isPrimitive(node))
      .ToArray()

    // 3. send diagnosis
    const diagnostics = AsEnumerable(primitiveNodes)
      .Select((node) => this.diagnosisPrimitveNodes(node))
      .Where((result) => result !== null)
      .Cast<Diagnostic>()
      .ToArray()

    return {
      uri: document.uri,
      diagnostics: diagnostics,
    }
  }

  private diagnosisPrimitveNodes(node: Injectable): Diagnostic | null {
    const text = node.content
    if (!text || !node.contentRange) {
      return null
    }

    const textRange = this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)
    if (!textRange) {
      return null
    }

    if (node.typeInfo.isInteger()) {
      return this.diagnosisInt(text, textRange)
    } else if (node.typeInfo.isBoolean()) {
      return this.diagnosisBool(text, textRange)
    } else if (node.typeInfo.isString()) {
      return this.diagnosisString(text, textRange)
    }

    return null
  }

  private diagnosisInt(text: string, range: ls.Range): Diagnostic | null {
    if (isInteger(text)) {
      return null
    }

    if (isFloat(text)) {
      return {
        range,
        message: `Floating point value "${text}" will be parsed as integer.`,
        severity: ls.DiagnosticSeverity.Warning,
      }
    }

    return {
      range,
      message: `Invalid value "${text}" for integer type.`,
      severity: ls.DiagnosticSeverity.Error,
    }
  }

  private diagnosisBool(text: string, range: ls.Range): Diagnostic | null {
    switch (text.toLowerCase()) {
      case 'true':
      case 'false':
        return null

      default:
        break
    }

    return {
      range,
      message: `Invalid value "${text}" for boolean type.`,
      severity: ls.DiagnosticSeverity.Error,
    }
  }

  private diagnosisString(text: string, range: ls.Range): ls.Diagnostic | null {
    if (text.startsWith(' ') || text.endsWith(' ')) {
      return {
        range,
        message: 'text value has preceding/trailing whitespace.',
        severity: ls.DiagnosticSeverity.Warning,
      }
    }

    return null
  }

  private isPrimitive(node: Injectable): boolean {
    const flag =
      node.typeInfo.isBoolean() || node.typeInfo.isInteger() || node.typeInfo.isString() || node.typeInfo.isColor32()

    return flag
  }
}
