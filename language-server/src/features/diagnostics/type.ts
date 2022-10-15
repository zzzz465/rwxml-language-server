import { Document, TypedElement, TypeInfoMap } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { getNodesBFS } from '../utils'
import { DiagnosticsContributor } from './contributor'

@tsyringe.injectable()
export class Type implements DiagnosticsContributor {
  constructor(private readonly rangeConverter: RangeConverter) {}

  getDiagnostics(project: Project, document: Document): { uri: string; diagnostics: ls.Diagnostic[] } {
    const nodes = getNodesBFS(document)
    const typeInfoMap = project.defManager.typeInfoMap

    const typeNodes = AsEnumerable(nodes)
      .Where((node) => node instanceof TypedElement)
      .Cast<TypedElement>()
      .Where((node) => node.typeInfo.isType())
      .ToArray()

    const diagnostics = AsEnumerable(typeNodes)
      .Select((node) => this.diagnosisTypeNode(typeInfoMap, node))
      .Where((res) => res !== null)
      .Cast<ls.Diagnostic[]>()
      .SelectMany((x) => x)
      .ToArray()

    return {
      uri: document.uri,
      diagnostics,
    }
  }

  private diagnosisTypeNode(typeInfoMap: TypeInfoMap, node: TypedElement): ls.Diagnostic[] | null {
    if (!node.contentRange) {
      return null
    }

    const content = node.content
    const range = this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)
    if (!range || !content) {
      return null
    }

    if (!typeInfoMap.getTypeInfoByName(content)) {
      return [
        {
          message: `Unresolved reference ${content}`,
          range,
          severity: ls.DiagnosticSeverity.Error,
        },
      ]
    }

    return null
  }
}
