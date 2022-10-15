import { ElementType } from 'domelementtype'
import { DataNode } from './dataNode'

/**
 * Comments within the document.
 */

export class Comment extends DataNode {
  constructor(data: string) {
    super(ElementType.Comment, data)
  }

  toString(): string {
    // TODO: should I return this with <!-- data --> ??
    return this.data
  }
}
