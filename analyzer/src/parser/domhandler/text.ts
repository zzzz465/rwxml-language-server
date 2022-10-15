import { ElementType } from 'domelementtype'
import { TypeInfo } from '../../rimworld-types'
import { DataNode } from './dataNode'

/**
 * Text within the document.
 */

export class Text extends DataNode {
  /**
   * enum, boolean can have TypeInfo
   */
  typeInfo: TypeInfo | null = null

  constructor(data: string) {
    super(ElementType.Text, data)
  }
}
