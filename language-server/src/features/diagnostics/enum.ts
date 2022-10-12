import { Document, Element, Injectable } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { Project } from '../../project'
import jsonStr from '../../utils/json'
import { RangeConverter } from '../../utils/rangeConverter'
import { getNodesBFS } from '../utils'
import { DiagnosticsContributor } from './contributor'

@tsyringe.injectable()
export class Enum implements DiagnosticsContributor {
  constructor(private readonly rangeConverter: RangeConverter) {}

  getDiagnostics(project: Project, document: Document): { uri: string; diagnostics: ls.Diagnostic[] } {
    const nodes = getNodesBFS(document)

    const typeNodes = AsEnumerable(nodes)
      .Where((node) => node instanceof Injectable)
      .Cast<Injectable>()
      .Where((node) => node.typeInfo.isEnum && !!node.fieldInfo)
      .ToArray()

    const diagnostics = AsEnumerable(typeNodes)
      .SelectMany((node) => [...(this.checkEnumList(node) ?? []), ...(this.checkFlatEnum(node) ?? [])])
      .ToArray()

    return {
      uri: document.uri,
      diagnostics,
    }
  }

  /**
   * validate enum field structured as list.
   */
  private checkEnumList(enumNode: Injectable): ls.Diagnostic[] | null {
    if (enumNode.isLeafNode()) {
      return null
    }

    const diagnosis: ls.Diagnostic[] = []

    for (const childNode of enumNode.childNodes) {
      if (!(childNode instanceof Element)) {
        continue
      }

      const content = childNode.content ?? ''
      if (!childNode.contentRange) {
        // TOOD: print log
        continue
      }

      const range = this.rangeConverter.toLanguageServerRange(childNode.contentRange, enumNode.document.uri)
      if (!range) {
        // TODO: print log
        continue
      }

      if (childNode.tagName === 'li') {
        if (!enumNode.typeInfo.enums.includes(content)) {
          diagnosis.push({
            range,
            message: `Unknown enum value ${content}`,
          })
        }
      } else {
        diagnosis.push({
          range,
          message: `Enum field should not have other than <li> node.`,
        })
      }
    }

    return diagnosis
  }

  private checkFlatEnum(node: Injectable): ls.Diagnostic[] | null {
    if (!node.isLeafNode()) {
      return null
    }

    const nodeRange = this.rangeConverter.toLanguageServerRange(node.nodeRange, node.document.uri)
    if (!nodeRange) {
      // TODO: print error
      return null
    }

    const content = node.content?.trim() ?? ''
    if (!node.contentRange || content.trim() === '') {
      return [
        {
          range: nodeRange,
          message: 'enum value cannot be empty.',
        },
      ]
    }

    const range = this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)
    if (!range || !content) {
      return null
    }

    const invalidEnums = content
      .split(',')
      .map((str) => str.trim())
      .filter((e) => !node.typeInfo.enums.includes(e))

    if (invalidEnums.length > 0) {
      return [
        {
          message: `Unknown enum value ${jsonStr(invalidEnums)}`,
          range,
          severity: ls.DiagnosticSeverity.Error,
        },
      ]
    }

    return null
  }
}
