import { Injectable, Text } from '@rwxml/analyzer'
import { Connection, DefinitionLink } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../project'

type Result = {
  definitionLinks: DefinitionLink[]
  errors: any[]
}

export class Definition {
  onDefinition(project: Project, uri: URI, position: Position): Result {
    const ret: Result = {
      definitionLinks: [],
      errors: [],
    }

    const document = project.getXMLDocumentByUri(uri.toString())
    if (!document) {
      return ret
    }

    const offset = project.rangeConverter.toOffset(position, uri.toString())
    if (!offset) {
      return ret
    }

    const xmlDocument = project.getXMLDocumentByUri(uri)
    if (!xmlDocument) {
      return ret
    }

    const text = xmlDocument.findNodeAt(offset)
    const injectable = text?.parent as unknown
    if (injectable instanceof Injectable) {
      if (
        injectable.parentNode instanceof Injectable &&
        injectable.parentNode.typeInfo.isEnumerable() &&
        injectable.typeInfo.isDef()
      ) {
        // when node is inside list node
        const defType = injectable.typeInfo.getDefType()
        const defName = injectable.content
        const contentRange = injectable.contentRange

        if (!(defType && defName && contentRange)) {
          return ret
        }

        const range = project.rangeConverter.toLanguageServerRange(contentRange, injectable.document.uri)
        if (!range) {
          return ret
        }

        const defs = project.defManager.getDef(defType, defName)

        for (const def of defs) {
          const defNameNode = def.ChildElementNodes.find((node) => node.name === 'defName')
          const targetRange = project.rangeConverter.toLanguageServerRange(def.nodeRange, def.document.uri)

          if (!(defNameNode && targetRange)) {
            continue
          }

          const targetSelectionRange = project.rangeConverter.toLanguageServerRange(defNameNode.nodeRange, def.document.uri)
          if (!targetSelectionRange) {
            continue
          }
          
          ret.definitionLinks.push({
            targetRange,
            targetSelectionRange,
            targetUri: def.document.uri
          })
        }
      } else if (injectable.fieldInfo?.fieldType.isDef()) {

        const defType = injectable.fieldInfo.fieldType.getDefType()
        const defName = injectable.content
        if (defType && defName) {
          const defs = project.defManager.getDef(defType, defName)
          
          for (const def of defs) {
          const uri = def.document.uri
          const defNameNode = def.ChildElementNodes.find((node) => node.name === 'defName')
          const targetRange = project.rangeConverter.toLanguageServerRange(def.nodeRange, uri)
          
          let fail = true
          let targetSelectionRangeExists = true
          
          // FIXME: ugly code, must be refactored.
          if (targetRange) {
            if (defNameNode) {
              const targetSelectionRange = project.rangeConverter.toLanguageServerRange(defNameNode?.nodeRange, uri)
              if (targetSelectionRange) {
                const definitionLink: DefinitionLink = {
                  targetRange,
                  targetSelectionRange,
                  targetUri: uri,
                  // originSelectionRange // ???
                }
                
                ret.definitionLinks.push(definitionLink)
                fail = false
              } else {
                targetSelectionRangeExists = false
              }
            }
          }
          
          if (fail) {
            ret.errors.push({
              message: 'cannot create definitionLink.',
              uri: uri,
              defNameNodeExists: !!defNameNode,
              targetRangeExists: !!targetRange,
              targetSelectionRangeExists,
            })
          }
        }
      }
    }

    return ret
  }
}
