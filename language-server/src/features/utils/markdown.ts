import { TypedElement, TypeInfo } from '@rwxml/analyzer'

export function getCsharpFieldCodeBlock(name: string, accessor: string, type: string): string {
  return ['```csharp', `${accessor} ${type} ${name};`, '```'].join('\n')
}

export function getClassNameCodeBlock(node: TypedElement, showInherits = true): string {
  const className = getClassName(node.typeInfo)
  const texts = ['```csharp', `class ${className}`]

  if (showInherits && node.typeInfo.baseClass) {
    const baseClassName = getClassName(node.typeInfo.baseClass)
    texts.push((texts.pop() as string) + ` : ${baseClassName}`)
  }

  texts.push('```')

  return texts.join('\n')
}

export function getClassName(typeInfo: TypeInfo): string {
  return typeInfo.isGeneric ? getGenericClassNameToString(typeInfo) : typeInfo.className
}

export function getGenericClassNameToString(typeInfo: TypeInfo): string {
  const [name] = typeInfo.className.split('`')

  const genArgs = typeInfo.genericArguments
    .map((t) => {
      return t.isGeneric ? getGenericClassNameToString(t) : t.className
    })
    .join(', ')
    .replace('+', '.') // nested classes

  return `${name}<${genArgs}>`
}
