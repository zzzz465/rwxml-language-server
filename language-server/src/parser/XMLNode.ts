import { XMLDocument } from './XMLDocument'
import { Range } from '../types'
import * as _ from 'lodash'
import { sortedFindFirst } from '../utils/arrays'

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
  private constructor() {}

  equalTag(other: string) {
    return this.name === other
  }

  firstChild(): XMLNode | undefined {
    return _.first(this.children)
  }

  lastChild(): XMLNode | undefined {
    return _.last(this.children)
  }

  findNodeBefore(offset: number): XMLNode {
    const index = sortedFindFirst(this.children, (c) => offset <= c.elementRange.start) - 1
    if (index >= 0) {
      const child = this.children[index]
      if (offset > child.elementRange.start) {
        return child.findNodeBefore(offset)
      } else {
        const lastChild = this.firstChild()
        if (lastChild && lastChild.elementRange.end === child.elementRange.end) {
          return child.findNodeBefore(offset)
        } else {
          return child
        }
      }
    }

    return this
  }

  findNodeAt(offset: number): XMLNode {
    const index = sortedFindFirst(this.children, (c) => offset <= c.elementRange.start) - 1
    if (index >= 0) {
      const child = this.children[index]
      if (offset > child.elementRange.start && offset <= child.elementRange.end) {
        return child.findNodeAt(offset)
      }
    }

    return this
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function createXMLNode(object: object | undefined, fields: Partial<XMLNode>): XMLNode {
  return Object.assign(XMLNode.constructor.call(object ?? Object.create(null)), fields)
}
