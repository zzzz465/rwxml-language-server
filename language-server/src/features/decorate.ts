import { Injectable } from 'rwxml-analyzer'
import { Connection, Position, Range, TextDocuments } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { DecoItem, DecoType } from '../types'

type Result = {
  decoItems: DecoItem[]
  errors: any[]
}

export function onDecorate(project: Project, uri: URI): Result {
  const ret: Result = {
    decoItems: [],
    errors: [],
  }

  const document = project.getXMLDocumentByUri(uri)

  if (!document) {
    return ret
  }

  const injectables: Injectable[] = []
  document.findNode(injectables, (node) => node instanceof Injectable)

  for (const injectable of injectables) {
    // check def Reference is valid
    if (injectable.fieldInfo && injectable.fieldInfo.fieldType.isDef()) {
      const defType = injectable.fieldInfo.fieldType.getDefType()
      const defName = injectable.content
      if (defType && defName) {
        const defs = project.defManager.getDef(defType, defName)

        if (defs.length > 0) {
          const range = project.rangeConverter.toLanguageServerRange(injectable.contentRange, uri.toString())
          if (range) {
            ret.decoItems.push({
              decoType: 'content_defName',
              range,
            })
          } else {
            ret.errors.push(
              `cannot get range, start: ${injectable.contentRange.start}, end: ${
                injectable.contentRange.end
              }, uri: ${uri.toString()}`
            )
          }
        }
      }
    }
  }

  return ret
}
