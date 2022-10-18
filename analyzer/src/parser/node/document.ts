import { ElementType } from 'domelementtype'
import { Node, NodeWithChildren } from './node'

export class Document extends NodeWithChildren {
  uri: string
  rawText: string
  'x-mode'?: 'no-quirks' | 'quirks' | 'limited-quirks'

  get startIndex(): number {
    return 0
  }

  get endIndex(): number {
    return this.rawText.length
  }

  constructor(children: Node[], uri?: string, rawText = '') {
    super(ElementType.Root, children)
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
