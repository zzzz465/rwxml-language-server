import { XMLDocument } from './XMLDocument'
import { Range } from '../types'
import * as _ from 'lodash'
import { sortedFindFirst } from '../utils/arrays'

function range(): Range {
  return { start: -1, end: -1 }
}

export class XMLNode {
  readonly document: XMLDocument = <any>void 0
  readonly parent?: XMLNode
  readonly children: XMLNode[] = []
  readonly selfClosed: boolean = false
  readonly name: string | null = null
  readonly content: string | null = null
  readonly attributes: Record<string, string | null> = {}
  readonly validNode: boolean = false

  // ranges
  readonly elementRange: Range = range() // node 의 여는 태그 < 부터 닫는 태그 > 까지
  readonly tagNameRange: Range = range() // <tag> 에서, 이름에 해당하는 공간
  readonly startTagRange: Range = range() // 여는 태그의 < 부터 > 까지
  readonly endTagRange: Range = range() // 닫는 태그의 < 부터 > 까지
  readonly contentRange: Range = range() // value 의 시작 부터 끝까지 (공백포함)

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public constructor() {}

  equalTag(other: string) {
    return this.name === other
  }

  firstChild(): XMLNode | undefined {
    return _.first(this.children) as XMLNode
  }

  lastChild(): XMLNode | undefined {
    return _.last(this.children) as XMLNode
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
          return child as XMLNode
        }
      }
    }

    return this as XMLNode
  }

  findNodeAt(offset: number): XMLNode {
    const index = sortedFindFirst(this.children, (c) => offset <= c.elementRange.start) - 1
    if (index >= 0) {
      const child = this.children[index]
      if (offset > child.elementRange.start && offset <= child.elementRange.end) {
        return child.findNodeAt(offset)
      }
    }

    return this as XMLNode
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
