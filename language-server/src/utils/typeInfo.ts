import { TypeInfo, TypeInfoMap } from '@rwxml/analyzer'

export function isTypeDerivedFrom(T: TypeInfo, base: TypeInfo, typeInfoMap: TypeInfoMap): boolean {
  let currentType = T

  while (currentType.baseClass) {
    if (currentType.fullName === base.fullName) {
      return true
    } else {
      currentType = currentType.baseClass
    }
  }

  return false
}
