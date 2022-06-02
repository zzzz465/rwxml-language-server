import { Def, Injectable, Range } from '@rwxml/analyzer'
import { from } from 'linq-es2015'
import { map } from 'ramda'
import * as tsyringe from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { ProjectManager } from '../projectManager'
import { mergeResult, pipeWithResult, Result } from '../utils/functional/result'
import { RangeConverter } from '../utils/rangeConverter'
import { Provider } from './provider'
import { getDocument } from './utils'
import { getDefs, toLocation, toRange } from './utils/node'

type CodeLensType = 'reference'

// TODO: add clear(document) when file removed from pool.
@tsyringe.singleton()
export class CodeLens implements Provider {
  private readonly _toRange: ReturnType<typeof toRange>

  constructor(private readonly projectManager: ProjectManager, rangeConverter: RangeConverter) {
    this._toRange = toRange(rangeConverter)
  }

  init(connection: lsp.Connection): void {
    connection.onCodeLens((p, t) => this.onCodeLensRequest(p, t))
  }

  // (params: P, token: CancellationToken, workDoneProgress: WorkDoneProgressReporter, resultProgress?: ResultProgressReporter<PR>): HandlerResult<R, E>;
  private async onCodeLensRequest(
    params: lsp.CodeLensParams,
    token: lsp.CancellationToken
  ): Promise<lsp.CodeLens[] | null> {
    return from(this.projectManager.projects)
      .SelectMany((proj) => this.codeLens(proj, URI.parse(params.textDocument.uri)))
      .ToArray()
  }

  private codeLens(project: Project, uri: URI): lsp.CodeLens[] {
    const result = getDocument(project, uri)
    if (result.err()) {
      return []
    }

    const defs = res.right

    // 작은 함수를 합성해서 새로운 함수를 만들어내야 한다.

    // 1. isDef? (이미 구현, 내장되어 있음)
    // 2. range 변환 성공하였는가?
    // 3. defName, defNameContentRange, position 구할 수 있는가?
    // 4. resolve wanters 구할 수 있는가?

    // 이제 합성 어떻게 하는거지?
    // object 형식으로도 가능하고, 배열의 형태로도 가능하다.
    // 배열은 juxt 를 쓰면 될태고, object 는... 머리아프당 히히
    // 필요한 데이터들
    // def -> 문제없음
    // nodeRange -> element 필요
    // defNameRange -> def 필요
    // defName -> def 필요
    // resolveWanters -> 간단하니 안에서 구할수도 있겠다.
    // 데이터 완성을 위해 -> defName, range, resolveWanters length
    // uri -> closure 에서 끌어옴

      if (!range) {
        continue
      }

      const defName = def.getDefName()
      const defNameContentRange =
        def.ChildElementNodes.find((node) => node.name === 'defName')?.contentRange ?? new Range()
      const position = this.rangeConverter.toLanguageServerRange(defNameContentRange, uri.toString())?.start
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
