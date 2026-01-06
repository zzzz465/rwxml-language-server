import { Document, Element, TypedElement } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import _ from 'lodash'
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
      .Where((node) => node instanceof TypedElement)
      .Cast<TypedElement>()
      .Where((node) => node.typeInfo.isEnum && !!node.fieldInfo)
      .ToArray()

    const diagnostics = typeNodes.flatMap((node) => this.checkEnum(node) ?? [])

    return {
      uri: document.uri,
      diagnostics,
    }
  }

  checkEnum(node: TypedElement): ls.Diagnostic[] | null {
    if (node.isLeafNode()) {
      return this.checkFlatEnum(node)
    } else {
      return this.checkEnumList(node)
    }
  }

  /**
   * validate enum field structured as list.
   */
  private checkEnumList(enumNode: TypedElement): ls.Diagnostic[] | null {
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

  private checkFlatEnum(node: TypedElement): ls.Diagnostic[] | null {
    if (!node.isLeafNode()) {
      return null
    }

    const nodeRange = this.rangeConverter.toLanguageServerRange(node.nodeRange, node.document.uri)
    if (!nodeRange) {
      // TODO: print error
      return null
    }

    const content = node.content?.trim() ?? ''
    if (!node.contentRange) {
      return null
    }

    if (!node.contentRange || content.trim() === '') {
      // enum can be empty?
      // return [
      //   {
      //     range: nodeRange,
      //     message: 'enum value cannot be empty.',
      //   },
      // ]
    }

    const range = this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)
    if (!range || !content) {
      return null
    }

    const numericParsed = _.parseInt(content)
    if (!_.isNaN(numericParsed) || node.typeInfo.enums.length === 0) {
      // If it's a number or if we have no enum data, treat it as potentially valid
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
