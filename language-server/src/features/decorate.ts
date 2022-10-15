/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Attribute, Def, Document, Element, Node, Range, Text, TypedElement } from '@rwxml/analyzer'
import * as tsyringe from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import * as winston from 'winston'
import { DocumentTokenRequest, DocumentTokenRequestResponse } from '../events'
import defaultLogger, { withClass } from '../log'
import { Project } from '../project'
import { DocumentToken } from '../types/documentToken'
import { RangeConverter } from '../utils/rangeConverter'
import { Definition } from './definition'
import { Provider } from './provider'
import { getNodesBFS, getRootElement } from './utils/node'
import { ProjectHelper } from './utils/project'

// // TODO: add clear(document) when file removed from pool.
@tsyringe.injectable()
export class DecoProvider implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(DecoProvider)),
    transports: [defaultLogger()],
  })

  constructor(
    private readonly projectHelper: ProjectHelper,
    private readonly rangeConverter: RangeConverter,
    private readonly defProvider: Definition
  ) {}

  init(connection: Connection): void {
    connection.onRequest(
      DocumentTokenRequest,
      this.projectHelper.wrapExceptionStackTraces(this.onTokenRequest.bind(this), this.log)
    )
  }

  private onTokenRequest(p: DocumentTokenRequest): DocumentTokenRequestResponse | null {
    const projects = this.projectHelper.getProjects(p.uri).filter((project) => project.state === 'ready')
    if (projects.length === 0) {
      return { tokens: [], uri: p.uri }
    }

    const tokens: DocumentToken[] = []

    for (const proj of projects) {
      const doc = proj.getXMLDocumentByUri(p.uri)

      if (!doc || getRootElement(doc)?.tagName !== 'Defs') {
        continue
      }

      tokens.push(...this.getTokenFromDoc(proj, doc))
    }

    return { uri: p.uri, tokens }
  }

  private getTokenFromDoc(project: Project, doc: Document): DocumentToken[] {
    // traverse nodes and get nodes
    const nodes: Node[] = this.getNodesBFS(doc)

    return nodes.map((node) => this.getTokens(project, node)).flat()
  }

  private getNodesBFS(doc: Document): Node[] {
    return getNodesBFS(doc)
  }

  private getTokens(project: Project, node: Node): DocumentToken[] {
    if (node instanceof Def) {
      return this.getTokenOfDef(project, node)
    } else if (node instanceof TypedElement) {
      return this.getTokenOfTypedElement(project, node)
    } else if (node instanceof Element) {
      if (node.tagName === 'Defs') {
        return this.getTokenOfRootDefs(project, node)
      } else {
        // non <Defs> node should not be decorated at all
        return this.getTokenOfElement(project, node)
      }
    } else if (node instanceof Text) {
      return this.getTokenOfText(project, node)
    } else {
      return []
    }
  }

  private getTokenOfRootDefs(project: Project, node: Element): DocumentToken[] {
    const res: DocumentToken[] = []

    res.push(...this.getNodeOpenCloseTokens(node))

    return res
  }

  private getTokenOfDef(project: Project, def: Def): DocumentToken[] {
    const res: DocumentToken[] = []

    res.push(...this.getNodeOpenCloseTokens(def))
    res.push(...this.getAttributeValueTokens(project, def))

    return res
  }

  private getTokenOfTypedElement(project: Project, node: TypedElement): DocumentToken[] {
    const res: DocumentToken[] = []

    res.push(...this.getNodeOpenCloseTokens(node))
    res.push(...this.getAttributeValueTokens(project, node))

    return res
  }

  private getTokenOfElement(project: Project, node: Element): DocumentToken[] {
    // NOTE: this element is not TypedElement
    const res: DocumentToken[] = []

    res.push(...this.getNodeOpenCloseTokens(node))
    res.push({
      range: this.rangeConverter.toLanguageServerRange(node.nodeRange, node.document.uri)!,
      type: 'tag',
    })

    if (node.contentRange) {
      res.push({
        range: this.rangeConverter.toLanguageServerRange(node.contentRange, node.document.uri)!,
        type: 'tag.content',
      })
    }

    return res
  }

  private getTokenOfText(project: Project, node: Text): DocumentToken[] {
    const res: DocumentToken[] = []
    const uri = node.document.uri
    const offset = node.dataRange.start + 1
    if (!(node.parent instanceof TypedElement)) {
      return []
    }

    const textNode = node as Text & { parent: TypedElement }

    if (textNode.parent.typeInfo.isDef()) {
      const definitions = this.defProvider.findDefinitions(project.defManager, node.document, offset)
      if (definitions.length > 0) {
        res.push({
          range: this.rangeConverter.toLanguageServerRange(textNode.dataRange, uri)!,
          type: 'injectable.content.defReference.linked',
        })
      } else {
        res.push({
          range: this.rangeConverter.toLanguageServerRange(textNode.dataRange, uri)!,
          type: 'injectable.content.defReference',
        })
      }
    }

    return res
  }

  private getNodeOpenCloseTokens(node: TypedElement | Def | Element): DocumentToken[] {
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

  private getAttributeValueTokens(project: Project, node: TypedElement | Def): DocumentToken[] {
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

      if (
        this.defProvider.findDefinitions(project.defManager, node.document, parentNameAttrib.valueRange.start).length >
        0
      ) {
        res.push({
          range: this.rangeConverter.toLanguageServerRange(parentNameAttrib.valueRange, uri)!,
          type: `${prefix}.open.parentNameAttributeValue.linked`,
        })
      } else {
        res.push({
          range: this.rangeConverter.toLanguageServerRange(parentNameAttrib.valueRange, uri)!,
          type: `${prefix}.open.parentNameAttributeValue`,
        })
      }
    }

    const classAttrib: Attribute | undefined = node.attribs['Class']
    if (classAttrib) {
      res.push({
        range: this.rangeConverter.toLanguageServerRange(classAttrib.nameRange, uri)!,
        type: `${prefix}.open.classAttribute`,
      })
      // TODO: check class attribute value is valid or not.
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

  private getPrefixOf(node: Def | Element | TypedElement): 'def' | 'injectable' | 'defs' | 'tag' {
    if (node instanceof Def) {
      return 'def'
    } else if (node instanceof TypedElement) {
      return 'injectable'
    } else if (node.tagName === 'Defs') {
      return 'defs'
    } else {
      return 'tag'
    }
  }
}
