import * as tsyringe from 'tsyringe'
import { Diagnostic } from 'vscode-languageserver'
import { DiagnosticsContributor } from './contributor'

/**
 * Noop implements DiagnosticsContributor that does nothing.
 * it's used to prevent no token registered error
 */
@tsyringe.injectable()
export class Noop implements DiagnosticsContributor {
  getDiagnostics(): { uri: string; diagnostics: Diagnostic[] } {
    return { uri: '', diagnostics: [] }
  }
}
