import { XMLDocument } from './XMLDocument'
import { Range } from '../types'
import * as _ from 'lodash'
import { sortedFindFirst } from '../utils/arrays'

function range(): Range {
  return { start: -1, end: -1 }
}

export type XMLNode = ValidXMLNode | InvalidXMLNode

export interface InvalidXMLNode extends IXMLNode {
  validNode: false
}

export interface ValidXMLNode extends IXMLNode {
  validNode: true
  name: string
  content: string
}

export interface IXMLNode extends Readonly<XMLNodeBase> {
  readonly children: XMLNode[]
}

export class XMLNodeBase {
  document: XMLDocument = <any>void 0
  parent?: XMLNodeBase
  children: XMLNodeBase[] = []
  selfClosed = false
  name: string | null = null
  content: string | null = null
  attributes: Record<string, string | null> = {}
  validNode = false

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

  firstChild(): XMLNodeBase | undefined {
    return _.first(this.children)
  }

  lastChild(): XMLNodeBase | undefined {
    return _.last(this.children)
  }

  findNodeBefore(offset: number): XMLNodeBase {
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

  findNodeAt(offset: number): XMLNodeBase {
    const index = sortedFindFirst(this.children, (c) => offset <= c.elementRange.start) - 1
    if (index >= 0) {
      const child = this.children[index]
      if (offset > child.elementRange.start && offset <= child.elementRange.end) {
        return child.findNodeAt(offset)
      }
    }

    return this
  }

  findNode(dest: XMLNode[], predicate: (xmlNode: XMLNode) => boolean): void {
    if (predicate(this as XMLNode)) {
      dest.push(this as XMLNode)
    }

    for (const child of this.children) {
      child.findNode(dest, predicate)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function createXMLNode(object: object | undefined, fields: Partial<XMLNodeBase>): XMLNodeBase {
  return Object.assign(XMLNodeBase.constructor.call(object ?? Object.create(null)), fields)
}
