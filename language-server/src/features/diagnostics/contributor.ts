import { Def, Document, Injectable, Node } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import { Project } from '../../project'
import * as ls from 'vscode-languageserver'
import { Noop } from './noop'
import { DuplicatedNode } from './duplicatedNode'

/**
 * DiagnosticsContributor is a interface that provides diagnostics
 * against defs / files.
 */
@tsyringe.registry([
  {
    token: DiagnosticsContributor.token,
    useClass: Noop,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: DiagnosticsContributor.token,
    useClass: DuplicatedNode,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
])
export abstract class DiagnosticsContributor {
  static readonly token = Symbol(DiagnosticsContributor.name)

  /**
   * getDiagnostics returns language server diagnostics from given arguments.
   * @param project the currnet project context.
   * @param document the document that need to be diagnosed.
   * @param dirtyInjectables optional project-wide dirty injectable/defs.
   */
  abstract getDiagnostics(
    project: Project,
    document: Document,
    dirtyInjectables: (Def | Injectable)[]
  ): { uri: string; diagnostics: ls.Diagnostic[] }
}
