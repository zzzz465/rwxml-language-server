import { Def, Element, Injectable } from '@rwxml/analyzer'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'

export class CodeLens {
  onCodeLens(project: Project, uri: URI): lsp.CodeLens[] {
    const document = project.getXMLDocumentByUri(uri)
    const root = document?.children.find((node) => node instanceof Element) as Element | undefined

    if (!root || !(root.name === 'Defs')) {
      return []
    }

    const res: lsp.CodeLens[] = []

    for (const def of root.ChildElementNodes) {
      if (!(def instanceof Def)) {
        continue
      }

      const range = project.rangeConverter.toLanguageServerRange(def.nodeRange, def.document.uri)

      if (!range) {
        continue
      }

      const defName = def.getDefName()
      if (defName) {
        const counts = project.defManager.getReferenceResolveWanters(defName).length
        res.push({
          range,
          command: lsp.Command.create(`${counts} References`, 'rwxml-language-server:CodeLens:defReference'),
        })
      }
    }

    return res
  }
}
