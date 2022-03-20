import { Node } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import { Diagnostic } from 'vscode-languageserver'
import { Project } from '../../project'
import { DiagnosticsContributor } from './contributor'

/**
 * Noop implements DiagnosticsContributor that does nothing.
 * it's used to prevent no token registered error
 */
@tsyringe.injectable()
export class Noop implements DiagnosticsContributor {
  getDiagnostics(project: Project, uri: string, nodes: Node[]): { uri: string; diagnostics: Diagnostic[] } {
    return { uri, diagnostics: [] }
  }
}
