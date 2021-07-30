import { XMLDocument } from './XMLDocument'
import { Range } from '../types'

function range(): Range {
  return { start: -1, end: -1 }
}

export class XMLNode {
  document: XMLDocument = <any>void 0
  parent?: XMLNode
  children: XMLNode[] = []
  validNode = false
  selfClosed = false
  name = ''
  content = ''
  attributes: Record<string, string | null> = {}

  // ranges
  readonly elementRange: Range = range() // node 의 여는 태그 < 부터 닫는 태그 > 까지
  readonly tagNameRange: Range = range() // <tag> 에서, 이름에 해당하는 공간
  readonly startTagRange: Range = range() // 여는 태그의 < 부터 > 까지
  readonly endTagRange: Range = range() // 닫는 태그의 < 부터 > 까지
  readonly contentRange: Range = range() // value 의 시작 부터 끝까지 (공백포함)

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() { }

  equalTag(other: string) {
    return this.name === other
  }

  findNodeBefore(offset: number): XMLNode { }

  findNodeAt(offset: number): XMLNode { }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function createXMLNode(object: object | undefined, fields: Partial<XMLNode>): XMLNode {
  return Object.assign(XMLNode.constructor.call(object ?? Object.create(null)), fields)
}
