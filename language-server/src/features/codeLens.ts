import { Def, Element } from '@rwxml/analyzer'
import { either, option } from 'fp-ts'
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

// TODO: add clear(document) when file removed from pool.
@tsyringe.singleton()
export class CodeLens implements Provider {
  private readonly nodeRange: ToRange<Element>
  private readonly defNameRange: ToRange<Def>

  constructor(
    private readonly projectManager: ProjectManager,
    rangeConverter: RangeConverter,
    private readonly _toRange = toRange(rangeConverter) // 이거 tsyringe injection 어떻게 되는거지?
  ) {
    this.nodeRange = getNodeRange(_toRange)
    this.defNameRange = getDefNameRange(_toRange)
  }

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

    const results: lsp.CodeLens[] = []

    for (const def of res.right) {
      const res = sequenceT(option.Apply)(this.nodeRange(def), getPos(this._toRange, def), getReferences(def))
      if (option.isNone(res)) {
        continue
      }

      const [range, pos, injectables] = res.value

      results.push({
        range,
        command: {
          title: `${injectables.length} Def References`,
          command: injectables.length ? 'rwxml-language-server:CodeLens:defReference' : '',
          arguments: [uri.toString(), pos],
        },
      })
    }

    return results
  }
}
