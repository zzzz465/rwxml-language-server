import { ElementType } from 'domelementtype'
import { Element } from './element'
import { Node } from './node'

/**
 * The root node of the document.
 */

export class Document extends Element {
  uri: string
  rawText: string
  'x-mode'?: 'no-quirks' | 'quirks' | 'limited-quirks'

  constructor(children: Node[], uri?: string, rawText = '') {
    super(ElementType.Root, {})
    this.uri = uri ?? ''
    this.rawText = rawText
  }

  getCharAt(offset: number): string {
    return this.rawText.charAt(offset)
  }

  toString(): string {
    return this.rawText
  }
}
