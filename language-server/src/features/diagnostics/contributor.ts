import { Node } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import { Project } from '../../project'
import * as ls from 'vscode-languageserver'
import { Noop } from './noop'

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
])
export abstract class DiagnosticsContributor {
  static readonly token = Symbol(DiagnosticsContributor.name)

  abstract getDiagnostics(project: Project, uri: string, nodes: Node[]): { uri: string; diagnostics: ls.Diagnostic[] }
}
