import { TypeInfo } from './typeInfo'
import { TypeInfoMap } from './typeInfoMap'
import { AsEnumerable } from 'linq-es2015'
import { RawTypeInfo } from './rawTypeInfo'
import { FieldInfo } from './fieldInfo'

export default class TypeInfoLoader {
  static load(rawTypeInfos: RawTypeInfo[]): TypeInfoMap {
    const rawTypeInfoMap = AsEnumerable(rawTypeInfos).ToMap(
      (k) => k.fullName,
      (k) => k
    )
    const typeInfoMap = AsEnumerable(rawTypeInfos).ToMap(
      (k) => k.fullName,
      (v) => new TypeInfo(v.fullName)
    )

    for (const [fullName, rawTypeInfo] of rawTypeInfoMap) {
      const typeInfo = typeInfoMap.get(fullName) as TypeInfo
      const fields = typeInfo.fields

      // register all fields
      for (const [fieldName, rawFieldInfo] of Object.entries(rawTypeInfo.fields)) {
        const typeIdentifier = rawFieldInfo.fullName
        const fieldTypeInfo = typeInfoMap.get(typeIdentifier) as TypeInfo

        if (fields.has(fieldName)) {
          throw new Error(
            `exception while connecting field to typeInfo: field ${fieldName} already exists in type ${fullName}`
          )
        }

        const fieldInfo = new FieldInfo(rawFieldInfo.fieldMetadata, fieldTypeInfo)

        fields.set(fieldName, fieldInfo)
      }
    }

    // freeze objects
    ;[...typeInfoMap.values()].map((t) => {
      Object.freeze(t)
      Object.freeze(t.metadata)
      Object.freeze(t.fields)
    })

    const ret = new TypeInfoMap()
    ret.addTypeInfos(...typeInfoMap.values())
    return ret
  }
}
