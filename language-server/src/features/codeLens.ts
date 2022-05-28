import { Def, Element, Injectable, Range } from '@rwxml/analyzer'
import { container, injectable } from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { RangeConverter } from '../utils/rangeConverter'
import { toLocation } from './utils/node'

// TODO: add clear(document) when file removed from pool.
@injectable()
export class CodeLens {
  onCodeLens(project: Project, uri: URI): lsp.CodeLens[] {
    const document = project.getXMLDocumentByUri(uri)
    const rangeConverter = container.resolve(RangeConverter)
    const root = document?.children.find((node) => node instanceof Element) as Element | undefined

    if (!root || !(root.name === 'Defs')) {
      return []
    }

    const res: lsp.CodeLens[] = []

    for (const def of root.ChildElementNodes) {
      if (!(def instanceof Def)) {
        continue
      }

      const range = rangeConverter.toLanguageServerRange(def.nodeRange, def.document.uri)

      if (!range) {
        continue
      }

      const defName = def.getDefName()
      const defNameContentRange =
        def.ChildElementNodes.find((node) => node.name === 'defName')?.contentRange ?? new Range()
      const position = rangeConverter.toLanguageServerRange(defNameContentRange, uri.toString())?.start
      if (defName && defNameContentRange && position) {
        const injectables = project.defManager.getReferenceResolveWanters(defName)

        res.push({
          range,
          // for command, see https://github.com/microsoft/vscode/blob/3c33989855def32ab5f614ab62d99b2cdaaf958e/src/vs/editor/contrib/gotoSymbol/goToCommands.ts#L742-L756
          // cannot call editor.action.showReferences directly because plain JSON is sended on grpc instead of object.
          command: {
            title: `${injectables.length} Def References`,
            command: injectables.length ? 'rwxml-language-server:CodeLens:defReference' : '',
            arguments: [uri.toString(), position],
          },
        })
      }
    }

    return res
  }

  private toLocations(converter: RangeConverter, node: Injectable): lsp.Location {
    const range = toLocation(converter, node)

    if (range) {
      return { range, uri: node.document.uri }
    } else {
      throw new Error(`cannot convert node ${node.name} to location, uri: ${decodeURIComponent(node.document.uri)}`)
    }
  }
}
