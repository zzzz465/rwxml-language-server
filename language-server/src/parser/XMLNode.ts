import { XMLDocument } from './XMLDocument'
import { Range } from '../types'

export class XMLNode {
  document: XMLDocument = <any>void 0
  parent?: XMLNode
  children: XMLNode[] = []
  validNode = false
  selfClosed = false
  name = ''

  // ranges
  readonly elementRange: Range = { start: -1, end: -1 } // node 의 여는 태그 < 부터 닫는 태그 > 까지
  readonly tagNameRange: Range = { start: -1, end: -1 } // <tag> 에서, 이름에 해당하는 공간
  readonly startTagRange: Range = { start: -1, end: -1 } // 여는 태그의 < 부터 > 까지
  readonly endTagRange: Range = { start: -1, end: -1 } // 닫는 태그의 < 부터 > 까지

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {
  }

  findNodeBefore(offset: number): XMLNode {
  }

  findNodeAt(offset: number): XMLNode {
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function createXMLNode(object: object | undefined, fields: Partial<XMLNode>): XMLNode {
  return Object.assign(XMLNode.constructor.call(object ?? Object.create(null)), fields)
}
