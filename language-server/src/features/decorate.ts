import { Injectable } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import { injectable } from 'tsyringe'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { DecoItem } from '../types'
import { RangeConverter } from '../utils/rangeConverter'

type Result = {
  decoItems: DecoItem[]
  errors: any[]
}

@injectable()
export class Decorate {
  constructor(private readonly rangeConverter: RangeConverter) {}

  onDecorate(project: Project, uri: URI): Result {
    const ret: Result = {
      decoItems: [],
      errors: [],
    }

    const document = project.getXMLDocumentByUri(uri)
    if (!document) {
      return ret
    }

    const injectables: Injectable[] = document.findNode((node) => node instanceof Injectable) as Injectable[]
    const items: (DecoItem | null)[] = []

    for (const injectable of injectables) {
      items.push(this.content_defName(project, injectable))
    }

    ret.decoItems = AsEnumerable(items)
      .Where((item) => !!item)
      .ToArray() as DecoItem[]

    return ret
  }

  private content_defName(project: Project, node: Injectable): DecoItem | null {
    // Def's parent is not injectable, so no typeInfo exists.
    if (node.parent.typeInfo && node.parent.typeInfo.isEnumerable() && node.typeInfo.isDef()) {
      const defType = node.typeInfo.getDefType() ?? ''
      const defName = node.content
      const contentRange = node.contentRange
      const defs = project.defManager.getDef(defType, defName)

      if (!defName || !contentRange) {
        return null
      }

      const range = this.rangeConverter.toLanguageServerRange(contentRange, node.document.uri)
      if (range && defs.length > 0) {
        return { decoType: 'content_defName', range }
      }
    } else if (node.fieldInfo && node.fieldInfo.fieldType.isDef()) {
      const defType = node.fieldInfo.fieldType.getDefType() ?? ''
      const defName = node.content
      const contentRange = node.contentRange
      const defs = project.defManager.getDef(defType, defName)

      if (!defName || !contentRange) {
        return null
      }

      const range = this.rangeConverter.toLanguageServerRange(contentRange, node.document.uri)
      if (defs.length > 0 && range) {
        return { decoType: 'content_defName', range }
      }
    }

    return null
  }
}
