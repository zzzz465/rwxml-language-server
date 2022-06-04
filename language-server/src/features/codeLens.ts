import { Element, Injectable } from '@rwxml/analyzer'
import stringify from 'fast-safe-stringify'
import { array, either, eq, option } from 'fp-ts'
import { sequenceS, sequenceT } from 'fp-ts/lib/Apply'
import { flow } from 'fp-ts/lib/function'
import { from } from 'linq-es2015'
import _ from 'lodash'
import * as tsyringe from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { ProjectManager } from '../projectManager'
import { RangeConverter } from '../utils/rangeConverter'
import { Provider } from './provider'
import { getDefNameStr, getDefsOfUri } from './utils'
import {
  getContentRange,
  getDefNameRange,
  nodeRange as getNodeRange,
  toRange as getToRange,
  toRange,
  ToRange,
} from './utils/range'

type CodeLensType = 'reference'

type Result = { range: lsp.Range; uri: string; pos: lsp.Position; ref: { uri: string; range: lsp.Range } }

const resultEq = eq.fromEquals<Result>(_.isEqual)

// TODO: add clear(document) when file removed from pool.
@tsyringe.singleton()
export class CodeLens implements Provider {
  private readonly _toRange: ReturnType<typeof toRange>
  private readonly nodeRange: ToRange<Element>

  constructor(private readonly projectManager: ProjectManager, rangeConverter: RangeConverter) {
    this._toRange = getToRange(rangeConverter)
    this.nodeRange = getNodeRange(this._toRange)
  }

  init(connection: lsp.Connection): void {
    connection.onCodeLens((p, t) => this.onCodeLensRequest(p))
  }

  // (params: P, token: CancellationToken, workDoneProgress: WorkDoneProgressReporter, resultProgress?: ResultProgressReporter<PR>): HandlerResult<R, E>;
  private async onCodeLensRequest(params: lsp.CodeLensParams): Promise<lsp.CodeLens[] | null> {
    // gather results from each projects, and merge result if multiple codelens in a same position.
    const results = from(this.projectManager.projects)
      .SelectMany((proj) => this.getDefReferences(proj, URI.parse(params.textDocument.uri)))
      .ToArray()

    const uniqResults = array.uniq(resultEq)(results)

    const returnData = from(uniqResults)
      .GroupBy((x) => stringify({ uri: x.uri, range: x.range, pos: x.pos }))
      .Select((x) => ({
        range: x[0].range,
        command: {
          title: `${x.length} Def References`,
          command: 'rwxml-language-server:CodeLens:defReference',
          arguments: [x[0].uri, x[0].pos],
        },
      }))
      .ToArray()

    this.log.debug(performance.measure('codelens performance: ', this.onCodeLensRequest.name))

    performance.clearMarks()
    performance.clearMeasures()

    return returnData
  }

  private getDefReferences(project: Project, uri: URI): Result[] {
    // functions
    const getResolveWanters = (defName: string) => project.defManager.getReferenceResolveWanters(defName)
    const getPos = flow(
      getDefNameRange,
      option.map((r) => r.start)
    )
    const getRefs = flow(getDefNameStr, option.map(getResolveWanters))
    const ref = (node: Injectable) =>
      sequenceS(option.Apply)({
        uri: option.of(node.document.uri),
        range: getContentRange(this._toRange, node),
      })

    // code
    const res = getDefsOfUri(project, uri)
    if (either.isLeft(res)) {
      return []
    }

    const results: Result[] = []

    for (const def of res.right) {
      const res = sequenceT(option.Apply)(this.nodeRange(def), getPos(this._toRange, def), getRefs(def))
      if (option.isNone(res)) {
        continue
      }

      const [range, pos, injectables] = res.value
      const refs = array.compact(injectables.map(ref))

      for (const ref of refs) {
        results.push({ range, pos, uri: uri.toString(), ref })
      }
    }

    return results
  }
}
