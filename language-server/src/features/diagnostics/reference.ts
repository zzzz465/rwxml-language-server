import * as ls from 'vscode-languageserver'
import * as tsyringe from 'tsyringe'
import * as winston from 'winston'
import { DiagnosticsContributor } from './contributor'
import { Document } from '@rwxml/analyzer'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { DocumentWithNodeMap } from '../../documentWithNodeMap'
import { Definition } from '../definition'
import { isGeneratedDef } from '../utils/def'
import defaultLogger, { className, logFormat } from '../../log'

@tsyringe.injectable()
export class Reference implements DiagnosticsContributor {
  private log = winston.createLogger({
    format: winston.format.combine(className(Reference), logFormat),
    transports: [defaultLogger()],
  })

  constructor(private readonly rangeConverter: RangeConverter, private readonly definition: Definition) {}

  getDiagnostics(project: Project, document: DocumentWithNodeMap): { uri: string; diagnostics: ls.Diagnostic[] } {
    // 1. grab all def from document
    // 2. get all injectable referencing this document?
    // 3. ignore non-project documents

    if (project.resourceStore.isDependencyFile(document.uri)) {
      return { uri: document.uri, diagnostics: [] }
    }

    const diagnostics: ls.Diagnostic[] = [
      ...this.diagnoseUnresolvedReferences(project, document),
      // ...this.diagnoseUnresolvedInherit(project, document), // not working at all. need fix
    ]

    return { uri: document.uri, diagnostics }
  }

  private diagnoseUnresolvedReferences(project: Project, document: DocumentWithNodeMap): ls.Diagnostic[] {
    const diagnostics: ls.Diagnostic[] = []

    for (const ref of document.injectables) {
      const offset = ref.contentRange?.start
      if (!offset) {
        continue
      }

      const range = this.rangeConverter.toLanguageServerRange(ref.contentRange, ref.document.uri)
      if (!range) {
        continue
      }

      if (!ref.content) {
        continue
      }

      const defs = this.definition.findReferencingDefsFromInjectable(project, ref)
      if (!defs || defs.length > 0) {
        continue
      }

      const message = isGeneratedDef(ref.content) ? 'Unresolved generated reference' : 'Unresolved reference'

      diagnostics.push({
        message: `${message} "${ref.content}"`,
        range,
        severity: ls.DiagnosticSeverity.Error,
      })
    }

    return diagnostics
  }

  private diagnoseUnresolvedInherit(project: Project, document: Document): ls.Diagnostic[] {
    const diagnostics: ls.Diagnostic[] = []

    /*
    for (const inherit of project.defManager.unresolvedInherits.filter((x) => x.document.uri === document.uri)) {
      const parentNameAttrib = inherit.attribs['ParentName']
      if (!parentNameAttrib) {
        continue
      }

      const range = this.rangeConverter.toLanguageServerRange(parentNameAttrib.valueRange, inherit.document.uri)
      if (!range) {
        continue
      }

      diagnostics.push({
        message: `Unresolved inheritance "${parentNameAttrib.value}"`,
        range,
        severity: ls.DiagnosticSeverity.Error,
      })
    }
    */

    return diagnostics
  }
}
