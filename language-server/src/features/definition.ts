import { Def, Injectable } from '@rwxml/analyzer'
import { DefinitionLink } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../project'

type Result = {
  definitionLinks: DefinitionLink[]
  errors: any[]
}

export function onDefinition(project: Project, uri: URI, position: Position): Result {
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

  const xmlNode = xmlDocument.findNodeAt(offset)
  if (xmlNode instanceof Injectable && xmlNode.fieldInfo?.fieldType.isDef()) {
    const defType = xmlNode.fieldInfo.fieldType.getDefType()
    const defName = xmlNode.content
    if (defType && defName) {
      const defs = project.defManager.getDef(defType, defName)

      for (const def of defs) {
        const uri = def.document.uri
        const defNameNode = def.children.find((node) => node.name === 'defName')
        const targetRange = project.rangeConverter.toLanguageServerRange(def.elementRange, uri)

        let fail = true
        let targetSelectionRangeExists = true

        // FIXME: ugly code, must be refactored.
        if (targetRange) {
          if (defNameNode) {
            const targetSelectionRange = project.rangeConverter.toLanguageServerRange(defNameNode?.contentRange, uri)
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
