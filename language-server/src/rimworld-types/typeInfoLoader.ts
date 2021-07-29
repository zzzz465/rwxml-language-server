import { TypeInfo } from './typeInfo'
import { TypeInfoMap } from './typeInfoMap'
import { AsEnumerable } from 'linq-es2015'
import { RawTypeInfo } from './rawTypeInfo'

export function load(rawTypeInfos: RawTypeInfo[]): TypeInfoMap {
  const rawTypeInfoMap = AsEnumerable(rawTypeInfos).ToMap(
    (k) => k.fullName,
    (k) => k
  )
  const typeInfoMap = AsEnumerable(rawTypeInfos).ToMap(
    (k) => k.fullName,
    () => TypeInfo.constructor.apply(Object.create(null))
  )

  for (const [fullName, rawTypeInfo] of rawTypeInfoMap) {
    const typeInfo = typeInfoMap.get(fullName) as TypeInfo

    const fields = new Map<string, TypeInfo>()

    // register all childNodes
    for (const [fieldName, typeIdentifier] of Object.entries(rawTypeInfo.childNodes)) {
      const fieldTypeInfo = typeInfoMap.get(typeIdentifier) as TypeInfo

      if (fields.has(fieldName)) {
        throw new Error(
          `exception while connecting field to typeInfo: field ${fieldName} already exists in type ${fullName}`
        )
      }

      fields.set(fieldName, fieldTypeInfo)
    }

    // assign values to typeInfo object
    Object.assign(typeInfo, {
      fullName,
      childNodes: fields,
      metadata: rawTypeInfo.metadata,
    } as TypeInfo)
  }

  // freeze objects
  ;[...typeInfoMap.values()].map((t) => {
    Object.freeze(t)
    Object.freeze(t.metadata)
    Object.freeze(t.childNodes)
  })

  const ret = new TypeInfoMap()
  ret.addTypeInfos(...typeInfoMap.values())
  return ret
}
