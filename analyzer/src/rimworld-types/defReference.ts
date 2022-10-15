import { Element } from "../parser";
import { Writable } from "../utils/types";
import { TypedElement } from "./typedElement";
import { TypeInfo } from "./typeInfo";

// const enum cannot be used, it will break test cases.
export enum DefReferenceType {
  RefWithCount,
  Hyperlink,
}

export class DefReference extends Element {
  static into(node: Element, typeInfo: TypeInfo, refType: DefReferenceType): DefReference {
    const ret = node as Writable<DefReference>

    ret.typeInfo = typeInfo
    ret.refType = refType

    Reflect.setPrototypeOf(ret, DefReference.prototype)

    return ret
  }

  readonly typeInfo!: TypeInfo
  readonly parent!: TypedElement
  readonly refType!: DefReferenceType

  private constructor() {
    super('', {})
    throw new Error('constructor must not be called')
  }
}
