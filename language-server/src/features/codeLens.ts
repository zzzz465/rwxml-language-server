import { Def, Injectable } from '@rwxml/analyzer'
import { either, option } from 'fp-ts'
import { flow, pipe } from 'fp-ts/lib/function'
import { from } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { ProjectManager } from '../projectManager'
import { RangeConverter } from '../utils/rangeConverter'
import { Provider } from './provider'
import { getDefNameStr, getDefsOfUri } from './utils'
import { getDefNameRange, nodeRange as getNodeRange, toRange } from './utils/range'

type CodeLensType = 'reference'

// TODO: add clear(document) when file removed from pool.
@tsyringe.singleton()
export class CodeLens implements Provider {
  constructor(
    private readonly projectManager: ProjectManager,
    rangeConverter: RangeConverter,
    private readonly _toRange = toRange(rangeConverter) // 이거 tsyringe injection 어떻게 되는거지?
  ) {}

  init(connection: lsp.Connection): void {
    connection.onCodeLens((p, t) => this.onCodeLensRequest(p, t))
  }

  // (params: P, token: CancellationToken, workDoneProgress: WorkDoneProgressReporter, resultProgress?: ResultProgressReporter<PR>): HandlerResult<R, E>;
  private async onCodeLensRequest(params: lsp.CodeLensParams): Promise<lsp.CodeLens[] | null> {
    return from(this.projectManager.projects)
      .SelectMany((proj) => this.codeLens(proj, URI.parse(params.textDocument.uri)))
      .ToArray()
  }

  private codeLens(project: Project, uri: URI): lsp.CodeLens[] {
    const res = getDefsOfUri(project, uri)
    if (either.isLeft(res)) {
      return []
    }

    const defs = res.right

    const nodeRange = getNodeRange(this._toRange)
    const defNameRange = getDefNameRange(this._toRange)
    const resolveWanters = project.defManager.getReferenceResolveWanters.bind(project)

    const getData = (def: Def) =>
      pipe(
        option.of(def),
        option.bindTo('def'),
        option.bind('range', ({ def }) => nodeRange(def)),
        option.bind('defName', ({ def }) => getDefNameStr(def)),
        option.bind('defNameRange', ({ def }) => defNameRange(def)),
        option.bind('pos', ({ defNameRange }) => option.fromNullable(defNameRange?.start)),
        option.bind('injectables', ({ defName }) => option.some(resolveWanters(defName)))
      )

    const makeResult = (arg: {
      def: Def
      range: lsp.Range
      pos: lsp.Position
      defName: string
      injectables: Injectable[]
    }): lsp.CodeLens => {
      const { pos, injectables, range } = arg

      return {
        range,
        command: {
          title: `${injectables.length} Def References`,
          command: injectables.length ? 'rwxml-language-server:CodeLens:defReference' : '',
          arguments: [uri.toString(), pos],
        },
      }
    }

    const getResult = flow(getData, option.map(makeResult))

    return defs
      .map(getResult)
      .filter(option.isSome)
      .map((x) => x.value)
  }
}
