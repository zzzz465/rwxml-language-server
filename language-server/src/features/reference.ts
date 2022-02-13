import { URI } from 'vscode-uri'
import { Project } from '../project'
import * as lsp from 'vscode-languageserver'
import { Element, Text } from '@rwxml/analyzer'
import { isPointingDefNameContent } from './utils/node'
import { RangeConverter } from '../utils/rangeConverter'
import { injectable } from 'tsyringe'

@injectable()
export class Reference {
  constructor(private readonly rangeConverter: RangeConverter) {}

  // TODO: seperate this to two methods, event handler and actual reference finder
  onReference(project: Project, uri: URI, position: lsp.Position): lsp.Location[] {
    const res: lsp.Location[] = []
    const offset = this.rangeConverter.toOffset(position, uri.toString())
    if (!offset) {
      return res
    }

    const document = project.getXMLDocumentByUri(uri)
    const node = document?.findNodeAt(offset)
    if (!(document && node)) {
      return res
    }

    if (isPointingDefNameContent(node, offset) && (node instanceof Element || node instanceof Text)) {
      const defName: string | undefined = node instanceof Text ? node.data : node.content
      if (defName) {
        res.push(...this.findDefNameReferences(project, defName))
      }
    }

    return res
  }

  findDefReference(project: Project, node: Element | Text, offset: number) {
    if (node instanceof Text && isPointingDefNameContent(node, offset)) {
      const defName = node.data
      return this.findDefNameReferences(project, defName)
    }
  }

  private findDefNameReferences(project: Project, defName: string): lsp.Location[] {
    const nodes = project.defManager.getReferenceResolveWanters(defName)
    const res: lsp.Location[] = []

    for (const node of nodes) {
      if (!node.contentRange) {
        throw new Error(`node ${node.name} marked as defNameReference but contentRange is undefined.`)
      }

      const range = this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)

      if (range) {
        res.push({ range, uri: node.document.uri })
      }
    }

    return res
  }
}
