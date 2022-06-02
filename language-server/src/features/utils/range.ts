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
export const toRange = _.curry((converter: RangeConverter, uri: string, range: Range) =>
  converter.toLanguageServerRange(range, uri)
)

/**
 * @returns option of node range of given element.
 */
export const nodeRange = _.curry((converter: RangeConverter, el: Element) =>
  toRange(converter, el.document.uri, el.nodeRange)
)

/**
 *
 * @returns option of defName content range of given def.
 */
export const defNameRange = (cv: RangeConverter, def: Def) =>
  pipe(
    def,
    getDefNameNode,
    option.map((node) => node.contentRange ?? null),
    option.chain(option.fromNullable),
    option.map((range) => cv.toLanguageServerRange(range, def.document.uri))
  )
