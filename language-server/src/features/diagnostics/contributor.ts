import { Def, Document, Injectable } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import { Project } from '../../project'
import * as ls from 'vscode-languageserver'
import { DuplicatedNode } from './duplicatedNode'
import { Reference } from './reference'
import { PrimitiveValue } from './primitive'
import { Type } from './type'
import { Enum } from './enum'
import { Property } from './property'

/**
 * DiagnosticsContributor is a interface that provides diagnostics
 * against defs / files.
 */
@tsyringe.registry([
  {
    token: DiagnosticsContributor.token,
    useClass: DuplicatedNode,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: DiagnosticsContributor.token,
    useClass: Reference,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: DiagnosticsContributor.token,
    useClass: PrimitiveValue,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: DiagnosticsContributor.token,
    useClass: Type,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: DiagnosticsContributor.token,
    useClass: Enum,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: DiagnosticsContributor.token,
    useClass: Property,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
])
export abstract class DiagnosticsContributor {
  static readonly token = Symbol(DiagnosticsContributor.name)

  /**
   * getDiagnostics returns language server diagnostics from given arguments.
   * @param project the currnet project context.
   * @param document the document that need to be diagnosed.
   * @param dirtyInjectables optional project-wide dirty injectable/defs. NOTE: contributor must evaluate only the nodes that matching to the given document.
   */
  abstract getDiagnostics(
    project: Project,
    document: Document,
    dirtyInjectables: (Def | Injectable)[]
  ): { uri: string; diagnostics: ls.Diagnostic[] }
}
