import { DefType } from './declaredType'
import { TypeInfo } from './typeInfo'

// TODO: support C# internal class (generated)
const fullNameRegexString = '([\\w]+\\.)+[\\w]+'
const fullNameRegex = new RegExp(fullNameRegexString)

export function isFullName(defType: DefType): boolean {
  return fullNameRegex.test(defType)
}

export function isDerivedType(derived: TypeInfo, base: TypeInfo): boolean {
  let type: TypeInfo | undefined = derived
  do {
    if (type === base) {
      return true
    }
  } while (type = type.baseClass)

  return false
}
