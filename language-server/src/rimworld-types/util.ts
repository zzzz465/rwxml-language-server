import { DefType } from './declaredType'

// TODO: support C# internal class (generated)
const fullNameRegexString = '([\\w]+\\.)+[\\w]+'
const fullNameRegex = new RegExp(fullNameRegexString)

export function isFullName(defType: DefType): boolean {
  return fullNameRegex.test(defType)
}
