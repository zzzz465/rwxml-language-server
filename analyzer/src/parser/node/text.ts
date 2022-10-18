import { ElementType } from 'domelementtype'
import { DataNode } from './dataNode'

/**
 * Text within the document.
 */
export class Text extends DataNode {
  constructor(data: string) {
    super(ElementType.Text, data)
  }
}
