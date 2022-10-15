import { Def, Document, TypedElement } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { Project } from '../../project'
import { DuplicatedNode } from './duplicatedNode'
import { Enum } from './enum'
import { PrimitiveValue } from './primitive'
import { Property } from './property'
import { Reference } from './reference'
import { Type } from './type'

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
   * @param dirtyTypedElements optional project-wide dirty typedElement/defs. NOTE: contributor must evaluate only the nodes that matching to the given document.
   */
  abstract getDiagnostics(
    project: Project,
    document: Document,
    dirtyTypedElements: (Def | TypedElement)[]
  ): { uri: string; diagnostics: ls.Diagnostic[] }
}
