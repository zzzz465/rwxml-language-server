import { Document, Element, Node, parse, Range, Text } from '@rwxml/analyzer'
import { either, option } from 'fp-ts'
import { flow } from 'fp-ts/lib/function'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import xmldom from 'xmldom'
import xpath from 'xpath'
import { FileStore } from '../fileStore'
import { Project } from '../project'
import { TextDocumentManager } from '../textDocumentManager'
import { Result } from '../utils/functional/result'
import { RangeConverter } from '../utils/rangeConverter'
import { getRootInProject, isElement } from './utils'
import { toRange } from './utils/range'

const getPatchNode = flow(
  getRootInProject,
  option.fromEither,
  option.chain(option.fromPredicate((node) => node.tagName === 'Patch'))
)

/**
 * PatchReference is a reference provider for patch xmls.
 */
@tsyringe.injectable()
export class PatchReference {
  private readonly _toRange: ReturnType<typeof toRange>

  constructor(
    private readonly rangeConverter: RangeConverter,
    private readonly fileStore: FileStore,
    private readonly textDocumentManager: TextDocumentManager
  ) {
    this._toRange = toRange(rangeConverter)
  }

  async getReference(project: Project, uri: string, location: ls.Position): Promise<ls.Location[]> {
    const offset = this.rangeConverter.toOffset(location, uri)
    if (!offset) {
      return []
    }

    const document = await this.getPatchDocument(uri)
    if (either.isLeft(document)) {
      return []
    }

    const elems = document.right.findNode((node) => node.tagName === 'Patch')
    if (elems.length === 0) {
      return []
    }

    const root = elems[0]

    let node = root.findNodeAt(offset) as Node | null
    if (node instanceof Text) {
      node = node.parent
    }

    if (!(node instanceof Element)) {
      return []
    }

    if (!isElement(node)) {
      return []
    }

    switch (node.tagName) {
      case 'xpath':
        return this.getXPathReference(project, node)
    }

    return []
  }

  private async getPatchDocument(uri: string): Promise<Result<Document>> {
    const text = await this.textDocumentManager.getText(uri)
    if (either.isLeft(text)) {
      return text
    }

    return either.right(parse(text.right, uri))
  }

  getXPathReference(project: Project, node: Element): ls.Location[] {
    const xpathStr = node.content
    if (!xpathStr) {
      return []
    }

    const documents = project.getXMLDocuments()
    const locations: ls.Location[] = []

    for (const doc of documents) {
      const node = new xmldom.DOMParser().parseFromString(doc.rawText)
      const results = xpath.select(xpathStr, node)

      for (const res of results) {
        const start = doc.rawText.indexOf(res.toString())
        const length = res.toString().length

        const range = new Range(start, start + length)
        const res2 = this._toRange(range, doc.uri)
        if (option.isNone(res2)) {
          continue
        }

        locations.push({
          range: res2.value,
          uri: doc.uri,
        })
      }
    }

    return locations
  }
}
