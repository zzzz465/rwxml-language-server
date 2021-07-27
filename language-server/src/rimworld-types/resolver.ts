import { TypeInfoMap } from './typeInfoMap'
import { AsEnumerable } from 'linq-es2015'

/**
 * resolve childNode relation between typeInfo objects
 * @param typeInfoMap
 */
export function resolveRelation(typeInfoMap: TypeInfoMap): void {
  const typeInfos = typeInfoMap.getAllNodes()
  const map = AsEnumerable(typeInfos).ToMap(
    (t) => t.fullName,
    (t) => t
  )

  throw new Error()
}
