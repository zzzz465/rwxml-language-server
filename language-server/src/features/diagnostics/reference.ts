import * as ls from 'vscode-languageserver'
import * as tsyringe from 'tsyringe'
import * as winston from 'winston'
import { DiagnosticsContributor } from './contributor'
import { Document, Def, Injectable } from '@rwxml/analyzer'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { LogToken } from '../../log'

@tsyringe.injectable()
export class Reference implements DiagnosticsContributor {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${Reference.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(private readonly rangeConverter: RangeConverter, @tsyringe.inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  getDiagnostics(
    project: Project,
    document: Document,
    dirtyInjectables: (Def | Injectable)[]
  ): { uri: string; diagnostics: ls.Diagnostic[] } {
    return { uri: document.uri, diagnostics: [] }
  }
}
