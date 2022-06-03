import { Element } from '@rwxml/analyzer'
import { either, number, option, semigroup } from 'fp-ts'
import { sequenceT } from 'fp-ts/lib/Apply'
import { flow } from 'fp-ts/lib/function'
import { from } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { ProjectManager } from '../projectManager'
import { RangeConverter } from '../utils/rangeConverter'
import { Provider } from './provider'
import { getDefNameStr, getDefsOfUri } from './utils'
import { getDefNameRange, nodeRange as getNodeRange, ToRange, toRange } from './utils/range'

type CodeLensType = 'reference'

type Result = { range: lsp.Range; uri: string; pos: lsp.Position; refCount: number }

const resultConcat = semigroup.struct<Result>({
  pos: semigroup.first(),
  range: semigroup.first(),
  refCount: number.SemigroupSum,
  uri: semigroup.first(),
}).concat

// TODO: add clear(document) when file removed from pool.
@tsyringe.singleton()
export class CodeLens implements Provider {
  private readonly nodeRange: ToRange<Element>

  constructor(
    private readonly projectManager: ProjectManager,
    rangeConverter: RangeConverter,
    private readonly _toRange = toRange(rangeConverter) // 이거 tsyringe injection 어떻게 되는거지?
  ) {
    this.nodeRange = getNodeRange(_toRange)
  }

  init(connection: lsp.Connection): void {
    connection.onCodeLens((p, t) => this.onCodeLensRequest(p))
  }

  // (params: P, token: CancellationToken, workDoneProgress: WorkDoneProgressReporter, resultProgress?: ResultProgressReporter<PR>): HandlerResult<R, E>;
  private async onCodeLensRequest(params: lsp.CodeLensParams): Promise<lsp.CodeLens[] | null> {
    // gather results from each projects, and merge result if multiple codelens in a same position.
    const results = from(this.projectManager.projects)
      .SelectMany((proj) => this.getDefReferences(proj, URI.parse(params.textDocument.uri)))
      .GroupBy((x) => {
        x.pos, x.range, x.uri
      })
      .Select((x) => x.reduce((prev, curr) => resultConcat(prev, curr)))
      .ToArray()

    return results.map((data) => ({
      range: data.range,
      command: {
        title: `${data.refCount} Def References`,
        command: 'rwxml-language-server:CodeLens:defReference',
        arguments: [data.uri, data.pos],
      },
    }))
  }

  private getDefReferences(project: Project, uri: URI): Result[] {
    // functions
    const getResolveWanters = project.defManager.getReferenceResolveWanters.bind(project)
    const getPos = flow(
      getDefNameRange,
      option.map((r) => r.start)
    )
    const getReferences = flow(getDefNameStr, option.map(getResolveWanters))

    // code
    const res = getDefsOfUri(project, uri)
    if (either.isLeft(res)) {
      return []
    }

    const results: Result[] = []

    for (const def of res.right) {
      const res = sequenceT(option.Apply)(this.nodeRange(def), getPos(this._toRange, def), getReferences(def))
      if (option.isNone(res)) {
        continue
      }

      const [range, pos, injectables] = res.value
      results.push({ range, pos, uri: uri.toString(), refCount: injectables.length })
    }

    return results
  }
}
