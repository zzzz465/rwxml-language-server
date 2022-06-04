import { Def, Element, Range } from '@rwxml/analyzer'
import { option } from 'fp-ts'
import { pipe } from 'fp-ts/lib/function'
import _ from 'lodash'
import * as lsp from 'vscode-languageserver'
import { RangeConverter } from '../../utils/rangeConverter'
import { getAttrib, getDefNameNode } from './node'

/**
 * converts range from given arguments.
 * @returns option of ls.range of given range.
 */
export const toRange = (converter: RangeConverter) => (range: Range, uri: string) =>
  pipe(converter.toLanguageServerRange(range, uri), option.fromNullable)

type _toRange = ReturnType<typeof toRange>
export type ToRange<T> = _.CurriedFunction1<T, option.Option<lsp.Range>>

/**
 * @returns option of node range of given element.
 */
export const toNodeRange = _.curry((toRange: _toRange, el: Element) => toRange(el.nodeRange, el.document.uri))

export const toAttribRange = (toRange: _toRange, el: Element, attribName: string) =>
  pipe(
    getAttrib(attribName, el),
    option.map((x) => new Range(x.nameRange.start, x.valueRange.end)),
    option.chain(_.curryRight(toRange)(el.document.uri))
  )

export const toAttribValueRange = (toRange: _toRange, el: Element, attribName: string) =>
  pipe(
    getAttrib(attribName, el),
    option.map((x) => x.valueRange),
    option.chain(_.curryRight(toRange)(el.document.uri))
  )

/**
 * toRange -> def -> Option<lsp.Range>
 * @returns option of defName content range of given def.
 */
export const getDefNameRange = _.curry((toRange: _toRange, def: Def) =>
  pipe(
    def,
    getDefNameNode,
    option.chain(option.fromNullableK((node) => node.contentRange ?? null)),
    option.chain((range) => toRange(range, def.document.uri))
  )
)

/**
 * (toRange, el) -> Option<lsp.Range> (of contentRange)
 */
export const getContentRange = _.curry((toRange: _toRange, el: Element) =>
  pipe(
    option.fromNullable(el.contentRange),
    option.chain((contentRange) => toRange(contentRange, el.document.uri))
  )
)

export const rangeInclude = (offset: number, range: Range) => range.include(offset)
