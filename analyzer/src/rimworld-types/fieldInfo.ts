import { TypeInfo } from './typeInfo'

export interface FieldInfoMetadata { }

export interface FieldAttributeData {
  attributeType: string
  ctorArgs: {
    type: string
    value: string
  }[]
}

export class FieldInfo {
  constructor(
    public readonly metadata: FieldInfoMetadata,
    public readonly declaringType: TypeInfo,
    public readonly fieldType: TypeInfo,
    public readonly attributes: Record<string, FieldAttributeData>,
    public readonly isPublic: boolean,
    public readonly isPrivate: boolean,
    public readonly name: string
  ) { }

  getFieldAliasName(): string | null {
    const attr = this.attributes['LoadAliasAttribute']
    if (attr && attr.ctorArgs.length === 1) {
      return attr.ctorArgs[0].value
    }

    return null
  }
}
