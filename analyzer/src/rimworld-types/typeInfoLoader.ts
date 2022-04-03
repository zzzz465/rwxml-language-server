import { TypeInfo } from './typeInfo'
import { TypeInfoMap } from './typeInfoMap'
import { AsEnumerable } from 'linq-es2015'
import { RawTypeInfo } from './rawTypeInfo'
import { FieldInfo } from './fieldInfo'
import { Writable } from '../utils/types'
import _ from 'lodash'

export class TypeInfoLoader {
  static load(rawTypeInfos: RawTypeInfo[]): TypeInfoMap {
    const rawData = JSON.parse(JSON.stringify(rawTypeInfos))

    const rawTypeInfoMap = AsEnumerable(rawTypeInfos).ToMap(
      (k) => k.fullName,
      (k) => k
    )
    const typeInfoMap: Map<string, TypeInfo> = new Map()

    for (const [fullname, rawTypeInfo] of rawTypeInfoMap) {
      if (fullname) {
        typeInfoMap.set(
          fullname,
          new TypeInfo(
            rawTypeInfo.metadata ?? {},
            rawTypeInfo.fullName ?? '',
            rawTypeInfo.namespaceName ?? '',
            rawTypeInfo.className ?? '',
            rawTypeInfo.attributes ?? {},
            rawTypeInfo.fields ?? {},
            rawTypeInfo.genericArguments ?? [],
            rawTypeInfo.baseClass,
            rawTypeInfo.methods ?? [],
            rawTypeInfo.isGeneric ?? false,
            rawTypeInfo.isArray ?? false,
            rawTypeInfo.isEnum ?? false,
            rawTypeInfo.enums ?? []
          )
        )
      }
    }

    // populate
    for (const [fullName] of rawTypeInfoMap) {
      if (fullName) {
        const typeInfo = typeInfoMap.get(fullName) as TypeInfo

        // populate attributes
        for (const [name, fullName] of Object.entries(typeInfo.attributes)) {
          const t = typeInfoMap.get(<string>(<unknown>fullName))
          if (t) {
            typeInfo.attributes.name = t
          }
        }

        // populate fields
        for (const field of Object.values<Writable<FieldInfo>>(typeInfo.fields)) {
          const fieldType = typeInfoMap.get(<string>(<unknown>field.fieldType))
          const declaringType = typeInfoMap.get(<string>(<unknown>field.declaringType))

          if (fieldType && declaringType) {
            field.fieldType = fieldType
            field.declaringType = declaringType
          } else {
            // throw new Error('fieldType or declaringType is undefined or null.')
          }
        }

        // populate genericArguments
        for (let i = 0; i < typeInfo.genericArguments.length; i++) {
          const genericArgumentTypeName = typeInfo.genericArguments[i] as unknown as string
          const genericArgumentType = typeInfoMap.get(genericArgumentTypeName)

          if (genericArgumentType) {
            typeInfo.genericArguments[i] = genericArgumentType
          } else {
            // throw new Error()
          }
        }

        // populate baseClass
        if (typeInfo.baseClass) {
          const baseClassTypeinfoName = typeInfo.baseClass as unknown as string
          const baseClassTypeInfo = typeInfoMap.get(baseClassTypeinfoName)

          if (baseClassTypeinfoName) {
            ;(typeInfo as Writable<TypeInfo>).baseClass = baseClassTypeInfo
          } else {
          }
        }
      }
    }

    const ret = new TypeInfoMap()
    ret.addTypeInfos(...typeInfoMap.values())

    ret.rawData = rawData
    return ret
  }
}
