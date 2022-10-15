import { Def, Element, TypedElement } from '@rwxml/analyzer'
import stringify from 'fast-safe-stringify'
import { array, either, option, semigroup } from 'fp-ts'
import { sequenceS, sequenceT } from 'fp-ts/lib/Apply'
import { flow, pipe } from 'fp-ts/lib/function'
import { from } from 'linq-es2015'
import _ from 'lodash'
import { juxt } from 'ramda'
import * as tsyringe from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import winston from 'winston'
import defaultLogger, { withClass } from '../log'
import { Project } from '../project'
import { ProjectManager } from '../projectManager'
import { RangeConverter } from '../utils/rangeConverter'
import { Provider } from './provider'
import { getAttrib, getDefNameStr, getDefsOfUri } from './utils'
import {
  getContentRange,
  getDefNameRange,
  toNodeRange as getNodeRange,
  toRange as getToRange,
  toRange,
  ToRange,
} from './utils/range'

/*
1. getDefRefCodeLens, getNameRefCodeLens 에서는 Result 를 반환한다.
*/

type CodeLensType = 'defReference' | 'nameReference'

type Result = {
  type: CodeLensType
  range: lsp.Range
  uri: string
  pos: lsp.Position
  refs: { uri: string; range: lsp.Range }[]
}

const resultKey = (r: Result) => stringify({ uri: r.uri, rane: r.range, pos: r.pos })
const resultSemigroup = semigroup.struct<Result>({
  type: semigroup.last(),
  pos: semigroup.last(),
  uri: semigroup.last(),
  range: semigroup.last(),
  refs: { concat: (x, y) => _.uniqWith([...x, ...y], _.isEqual) },
})
const resultConcatAll = semigroup.concatAll<Result>(resultSemigroup)({
  type: 'defReference',
  pos: 0 as never,
  range: 0 as never,
  uri: '',
  refs: [],
})
const resultToCodeLens = (r: Result): lsp.CodeLens => ({
  range: r.range,
  command: {
    command: `rwxml-language-server:CodeLens:${r.type}`,
    title: r.type === 'defReference' ? `${r.refs.length} Def References` : `${r.refs.length} Name References`,
    arguments: [r.uri, r.pos],
  },
})

// TODO: add clear(document) when file removed from pool.
@tsyringe.singleton()
export class CodeLens implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(CodeLens)),
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

    const uri = URI.parse(params.textDocument.uri)
    const functions = [this.getDefReferences.bind(this), this.getNameReferences.bind(this)]
    const getResults = flow(juxt(functions), array.flatten)

    const results = from(this.projectManager.projects)
      .SelectMany((x) => getResults(x, uri))
      .ToArray()

    const codeLensArr = from(results).GroupBy(resultKey).Select(resultConcatAll).Select(resultToCodeLens).ToArray()

    this.log.debug(stringify(performance.measure('codelens performance: ', this.onCodeLensRequest.name)))

    performance.clearMarks()
    performance.clearMeasures()

    return codeLensArr
  }

  private getDefReferences(project: Project, uri: URI): Result[] {
    // functions
    const getResolveWanters = (defName: string) => project.defManager.getReferenceResolveWanters(defName)
    const getPos = flow(
      getDefNameRange,
      option.map((r) => r.start)
    )
    const getRefs = flow(getDefNameStr, option.map(getResolveWanters))
    const ref = (node: TypedElement) =>
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

      const [range, pos, typedElements] = res.value
      const refs = array.compact(typedElements.map(ref))

      results.push({ type: 'defReference', range, pos, uri: uri.toString(), refs })
    }

    return results
  }

  private getNameReferences(project: Project, uri: URI): Result[] {
    const res = getDefsOfUri(project, uri)
    if (either.isLeft(res)) {
      return []
    }

    const results: Result[] = []

    for (const def of res.right) {
      const uri = def.document.uri

      const defRange = this.nodeRange(def)
      if (option.isNone(defRange)) {
        continue
      }

      const attrib = getAttrib('Name', def)
      if (option.isNone(attrib)) {
        continue
      }

      const pos = this._toRange(attrib.value.valueRange, uri)
      if (option.isNone(pos)) {
        continue
      }

      const resolveWanters = project.defManager.getInheritResolveWanters(attrib.value.value)
      const toRef = (def: Def) =>
        sequenceS(option.Apply)({
          range: getNodeRange(this._toRange, def),
          uri: option.some(def.document.uri),
        })

      results.push({
        type: 'nameReference',
        pos: pos.value.start,
        range: defRange.value,
        uri: def.document.uri,
        refs: pipe(resolveWanters.map(toRef), array.compact),
      })
    }

    return results
  }
}
