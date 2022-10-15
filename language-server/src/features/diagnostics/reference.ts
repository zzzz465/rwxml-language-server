import { Document } from '@rwxml/analyzer'
import { option } from 'fp-ts'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import * as winston from 'winston'
import { DocumentWithNodeMap } from '../../documentWithNodeMap'
import defaultLogger, { withClass } from '../../log'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { Definition } from '../definition'
import { getDefName, isGeneratedDef } from '../utils/def'
import { getContentRange, toRange } from '../utils/range'
import { DiagnosticsContributor } from './contributor'

@tsyringe.injectable()
export class Reference implements DiagnosticsContributor {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(Reference)),
    transports: [defaultLogger()],
  })

  private readonly _toRange: ReturnType<typeof toRange>

  constructor(private readonly rangeConverter: RangeConverter, private readonly definition: Definition) {
    this._toRange = toRange(rangeConverter)
  }

  getDiagnostics(project: Project, document: DocumentWithNodeMap): { uri: string; diagnostics: ls.Diagnostic[] } {
    // 1. grab all def from document
    // 2. get all typedElement referencing this document?
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

    for (const ref of document.typedElements) {
      const contentRange = getContentRange(this._toRange, ref)
      if (option.isNone(contentRange)) {
        continue
      }

      const defType = ref.typeInfo.getDefType()
      if (!defType) {
        continue
      }

      const defName = getDefName(ref.content)
      if (!defName) {
        continue
      }

      const defs = project.defManager.getDef(defType, defName)
      if (defs.length > 0) {
        continue
      }

      const message = isGeneratedDef(ref.content!) ? 'Unresolved generated reference' : 'Unresolved reference'

      diagnostics.push({
        message: `${message} "${ref.content}"`,
        range: contentRange.value,
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
