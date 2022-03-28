import { TypeInfo } from '@rwxml/analyzer'

/**
 * getTypeReferenceName returns a string that references type.
 * when Namespace starts with "Verse", "RimWorld", only class name is returned.
 * otherwise, returns full name.
 */
export function getTypeReferenceName(typeInfo: TypeInfo): string {
  if (typeInfo.namespaceName.startsWith('Verse') || typeInfo.namespaceName.startsWith('RimWorld')) {
    return typeInfo.className
  }

  return typeInfo.fullName
}
