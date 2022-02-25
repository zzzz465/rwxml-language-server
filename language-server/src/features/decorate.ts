/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Attribute, Def, Document, Element, Injectable, Node, NodeWithChildren, Range } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Logger } from 'winston'
import { LoadFolder } from '../mod/loadfolders'
import { Project } from '../project'
import { ProjectManager } from '../projectManager'
import { RangeConverter } from '../utils/rangeConverter'
import { Provider } from './provider'
import * as winston from 'winston'
import { LogToken } from '../log'
import { DocumentTokenRequest, DocumentTokenRequestResponse } from '../events'
import { Queue } from 'typescript-collections'
import { DocumentToken } from '../types/documentToken'

@tsyringe.injectable()
export class DecoProvider extends Provider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${DecoProvider.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(
    loadFolder: LoadFolder,
    projectManager: ProjectManager,
    private readonly rangeConverter: RangeConverter,
    @tsyringe.inject(LogToken) baseLogger: winston.Logger
  ) {
    super(loadFolder, projectManager)
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  protected getLogger(): Logger {
    return this.log
  }

  listen(connection: Connection): void {
    connection.onRequest(DocumentTokenRequest, this.wrapExceptionStackTraces(this.onTokenRequest.bind(this)))
  }

  private onTokenRequest(p: DocumentTokenRequest): DocumentTokenRequestResponse | null | undefined {
    const projects = this.getProjects(p.uri)

    const docs = projects.map((proj) => proj.getXMLDocumentByUri(p.uri)).filter((doc) => !!doc) as Document[]

    const tokens = docs.map((doc) => this.getTokenFromDoc(doc)).flat()

    return { uri: p.uri, tokens }
  }

  private getTokenFromDoc(doc: Document) {
    // traverse nodes and get nodes

    const nodes: Node[] = this.getNodesBFS(doc)

    return nodes.map((node) => this.getTokens(node)).flat()
  }

  private getNodesBFS(doc: Document) {
    const nodes: Node[] = []
    const queue = new Queue<Node>()

    queue.enqueue(doc)
    while (queue.size() > 0) {
      const node = queue.dequeue() as Node

      if (node instanceof NodeWithChildren) {
        for (const child of node.childNodes) {
          queue.enqueue(child)
        }
      }

      nodes.push(node)
    }

    return nodes
  }

  private getTokens(node: Node): DocumentToken[] {
    if (node instanceof Def) {
      return this.getTokenOfDef(node)
    } else if (node instanceof Injectable) {
      return this.getTokenOfInjectable(node)
    } else if (node instanceof Element) {
      return this.getTokenOfElement(node)
    } else {
      return []
    }
  }

  private getTokenOfDef(def: Def): DocumentToken[] {
    const res: DocumentToken[] = []

    res.push(...this.getNodeOpenCloseTokens(def))
    res.push(...this.getAttributeValueTokens(def))

    return res
  }

  private getTokenOfInjectable(node: Injectable): DocumentToken[] {
    const res: DocumentToken[] = []

    res.push(...this.getNodeOpenCloseTokens(node))
    res.push(...this.getAttributeValueTokens(node))

    return res
  }

  private getTokenOfElement(node: Element): DocumentToken[] {
    // NOTE: this element is not injectable
    const res: DocumentToken[] = []

    res.push(...this.getNodeOpenCloseTokens(node))

    if (node.contentRange) {
      res.push({
        range: this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)!,
        type: 'tag.content',
      })
    }

    return res
  }

  private getNodeOpenCloseTokens(node: Injectable | Def | Element): DocumentToken[] {
    const res: DocumentToken[] = []
    const uri = node.document.uri
    const prefix = this.getPrefixOf(node)

    res.push({
      range: this.rangeConverter.toLanguageServerRange(
        new Range(node.openTagRange.start, node.openTagRange.start + 1),
        uri
      )!,
      type: `${prefix}.open.<`,
    })
    res.push({
      range: this.rangeConverter.toLanguageServerRange(node.openTagNameRange, uri)!,
      type: `${prefix}.open.name`,
    })
    res.push({
      range: this.rangeConverter.toLanguageServerRange(
        new Range(node.openTagRange.end - 1, node.openTagRange.end),
        uri
      )!,
      type: `${prefix}.open.>`,
    })
    res.push({
      range: this.rangeConverter.toLanguageServerRange(
        new Range(node.closeTagRange.start, node.closeTagRange.start + 2),
        uri
      )!,
      type: `${prefix}.close.</`,
    })
    res.push({
      range: this.rangeConverter.toLanguageServerRange(node.closeTagNameRange, uri)!,
      type: `${prefix}.close.name`,
    })
    res.push({
      range: this.rangeConverter.toLanguageServerRange(
        new Range(node.closeTagRange.end - 1, node.closeTagRange.end),
        uri
      )!,
      type: `${prefix}.close.>`,
    })

    return res
  }

  private getAttributeValueTokens(node: Injectable | Def): DocumentToken[] {
    const res: DocumentToken[] = []
    const uri = node.document.uri
    const prefix = node instanceof Def ? 'def' : 'injectable'

    const nameAttrib: Attribute | undefined = node.attribs['Name']
    if (nameAttrib) {
      res.push({
        range: this.rangeConverter.toLanguageServerRange(nameAttrib.nameRange, uri)!,
        type: `${prefix}.open.nameAttribute`,
      })
      res.push({
        range: this.rangeConverter.toLanguageServerRange(nameAttrib.valueRange, uri)!,
        type: `${prefix}.open.nameAttributeValue`,
      })
    }

    const parentNameAttrib: Attribute | undefined = node.attribs['ParentName']
    if (parentNameAttrib) {
      res.push({
        range: this.rangeConverter.toLanguageServerRange(parentNameAttrib.nameRange, uri)!,
        type: `${prefix}.open.parentNameAttribute`,
      })
      res.push({
        range: this.rangeConverter.toLanguageServerRange(parentNameAttrib.valueRange, uri)!,
        type: `${prefix}.open.parentNameAttributeValue`,
      })
    }

    const classAttrib: Attribute | undefined = node.attribs['Class']
    if (classAttrib) {
      res.push({
        range: this.rangeConverter.toLanguageServerRange(classAttrib.nameRange, uri)!,
        type: `${prefix}.open.classAttribute`,
      })
      res.push({
        range: this.rangeConverter.toLanguageServerRange(classAttrib.valueRange, uri)!,
        type: `${prefix}.open.classAttributeValue`,
      })
    }

    const abstractAttrib: Attribute | undefined = node.attribs['Abstract']
    if (abstractAttrib) {
      res.push({
        range: this.rangeConverter.toLanguageServerRange(abstractAttrib.nameRange, uri)!,
        type: `${prefix}.open.AbstractAttribute`,
      })
      res.push({
        range: this.rangeConverter.toLanguageServerRange(abstractAttrib.valueRange, uri)!,
        type: `${prefix}.open.AbstractAttributeValue`,
      })
    }

    return res
  }

  private getPrefixOf(node: Def | Injectable | Element) {
    if (node instanceof Def) {
      return 'def'
    } else if (node instanceof Injectable) {
      return 'injectable'
    } else {
      return 'tag'
    }
  }
}
