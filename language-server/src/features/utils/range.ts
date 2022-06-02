import { Def, Element, Range } from '@rwxml/analyzer'
import { option } from 'fp-ts'
import { pipe } from 'fp-ts/lib/function'
import _ from 'lodash'
import { RangeConverter } from '../../utils/rangeConverter'
import { getDefNameNode } from './node'

/**
 * converts range from given arguments.
 * @returns option of ls.range of given range.
 */
export const toRange = (converter: RangeConverter) => (range: Range, uri: string) =>
  converter.toLanguageServerRange(range, uri)

type _toRange = ReturnType<typeof toRange>

/**
 * @returns option of node range of given element.
 */
export const nodeRange = _.curry((toRange: _toRange, el: Element) =>
  pipe(toRange(el.nodeRange, el.document.uri), option.fromNullable)
)

/**
 *
 * @returns option of defName content range of given def.
 */
export const getDefNameRange = _.curry((toRange: _toRange, def: Def) =>
  pipe(
    def,
    getDefNameNode,
    option.map((node) => node.contentRange ?? null),
    option.chain(option.fromNullable),
    option.map((range) => toRange(range, def.document.uri))
  )
)
