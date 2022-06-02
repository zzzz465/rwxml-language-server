import { Element } from '@rwxml/analyzer'
import { fromNullable } from 'fp-ts/lib/Option'
import _ from 'lodash'
import { RangeConverter } from '../../utils/rangeConverter'

export const toRange = _.curry((converter: RangeConverter, el: Element) =>
  fromNullable(converter.toLanguageServerRange(el.nodeRange, el.document.uri))
)
