import { Attribute, Node } from '../parser'
import { Def, TypedElement } from './typedElement'
import { TypeInfo } from './types'

// const enum cannot be used, it will break test cases.
export enum DefReferenceType {
  RefWithCount,
  Hyperlink,
}

export class DefReference extends TypedElement {
  static from(node: TypedElement, refType: DefReferenceType): DefReference {
    return new DefReference(node.tagName, node.attribs, node.parent, node.childNodes, node.typeInfo, refType)
  }

  readonly refType: DefReferenceType

  constructor(
    tagName: string,
    attribs: { [key: string]: Attribute },
    parent: TypedElement | Def,
    children: Node[],
    typeInfo: TypeInfo,
    refType: DefReferenceType
  ) {
    super(tagName, attribs, parent, typeInfo, undefined, children)

    this.refType = refType
  }
}
