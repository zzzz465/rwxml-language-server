import { Injectable } from '@rwxml/analyzer'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { DecoItem } from '../types'

type Result = {
  decoItems: DecoItem[]
  errors: any[]
}

export class Decorate {
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

    for (const injectable of injectables) {
      // check def Reference is valid
      if (injectable.fieldInfo && injectable.fieldInfo.fieldType.isDef()) {
        const defType = injectable.fieldInfo.fieldType.getDefType()
        const defName = injectable.content
        if (defType && defName) {
          const defs = project.defManager.getDef(defType, defName)

          if (defs.length > 0 && injectable.contentRange) {
            const range = project.rangeConverter.toLanguageServerRange(injectable.contentRange, uri.toString())
            if (range) {
              ret.decoItems.push({
                decoType: 'content_defName',
                range,
              })
            } else {
              ret.errors.push(
                `cannot get range, start: ${injectable.nodeRange.start}, end: ${
                  injectable.nodeRange.end
                }, uri: ${uri.toString()}`
              )
            }
          }
        }
      }
    }

    return ret
  }
}
