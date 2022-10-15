import { ElementType } from 'domelementtype'
import { Range } from '../range'
import { Node } from './node'

/**
 * A node that contains some data.
 */

export class DataNode extends Node {
  readonly nodeRange = new Range()
  readonly dataRange = new Range()

  /**
   * @param type The type of the node
   * @param data The content of the data node
   */
  constructor(type: ElementType.Comment | ElementType.Text | ElementType.Directive, public data: string) {
    super(type)
  }

  get nodeValue(): string {
    return this.data
  }

  set nodeValue(data: string) {
    this.data = data
  }

  get document(): Document {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Node = this
    while (!(node instanceof Document)) {
      if (node.parent) {
        node = node.parent
      } else {
        throw new Error(`node ${node}'s parent is not Document.`)
      }
    }

    return node
  }

  findNodeAt(offset: number): Node | null {
    throw new Error('Method not implemented.')
  }

  toString(): string {
    return this.data
  }
}
