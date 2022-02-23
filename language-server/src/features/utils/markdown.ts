import { TypeInfo } from '@rwxml/analyzer'

export function getCsharpText(name: string, accessor: string, type: string) {
  return ['```csharp', `${accessor} ${type} ${name};`, '```'].join('\n')
}

export function genericClassNameToString(typeInfo: TypeInfo): string {
  const [name] = typeInfo.className.split('`')

  const genArgs = typeInfo.genericArguments
    .map((t) => {
      return t.isGeneric ? genericClassNameToString(t) : t.className
    })
    .join(', ')

  return `${name}\<${genArgs}\>`
}
