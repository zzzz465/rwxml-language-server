import { ElementType } from 'domelementtype'
import { DataNode } from './dataNode'

/**
 * Processing instructions, including doc types.
 */

export class ProcessingInstruction extends DataNode {
  constructor(public name: string, data: string) {
    super(ElementType.Directive, data)
  }

  'x-name'?: string
  'x-publicId'?: string
  'x-systemId'?: string
}
