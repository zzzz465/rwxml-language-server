import { Element, Injectable } from '@rwxml/analyzer'
import stringify from 'fast-safe-stringify'
import { array, either, option, record, semigroup } from 'fp-ts'
import { sequenceS, sequenceT } from 'fp-ts/lib/Apply'
import { flow, pipe } from 'fp-ts/lib/function'
import { groupBy } from 'fp-ts/lib/NonEmptyArray'
import { from } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import winston from 'winston'
import defaultLogger, { className, logFormat } from '../log'
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

type Result = { range: lsp.Range; uri: string; pos: lsp.Position; refs: { uri: string; range: lsp.Range }[] }

const resultKey = (r: Result) => stringify({ uri: r.uri, rane: r.range, pos: r.pos })
const resultSemigroup = semigroup.struct<Result>({
  pos: semigroup.last(),
  uri: semigroup.last(),
  range: semigroup.last(),
  refs: array.getSemigroup(),
})
const resultConcatAll = semigroup.concatAll<Result>(resultSemigroup)({
  pos: 0 as any,
  range: 0 as any,
  uri: '',
  refs: [],
})

// TODO: add clear(document) when file removed from pool.
@tsyringe.singleton()
export class CodeLens implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(className(CodeLens), logFormat),
    transports: [defaultLogger()],
  })

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
    performance.mark(this.onCodeLensRequest.name)

    // gather results from each projects, and merge result if multiple codelens in a same position.
    const results = from(this.projectManager.projects)
      .SelectMany((proj) => this.getDefReferences(proj, URI.parse(params.textDocument.uri)))
      .ToArray()

    const res = pipe(
      results,
      groupBy(resultKey),
      record.map(resultConcatAll),
      (x) => Object.values(x),
      array.map((x) => ({
        range: x.range,
        command: {
          title: `${x.refs.length} Def References`,
          command: 'rwxml-language-server:CodeLens:defReference',
          arguments: [x.uri, x.pos],
        },
      }))
    )

    this.log.debug(stringify(performance.measure('codelens performance: ', this.onCodeLensRequest.name)))

    performance.clearMarks()
    performance.clearMeasures()

    return res
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

      results.push({ range, pos, uri: uri.toString(), refs })
    }

    return results
  }
}
