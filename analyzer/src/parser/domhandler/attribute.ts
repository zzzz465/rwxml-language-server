import { Range } from '../range'

/**
 * The description of an individual attribute.
 */

export interface Attribute {
  name: string
  value: string
  nameRange: Range
  valueRange: Range
  namespace?: string
  prefix?: string
}
