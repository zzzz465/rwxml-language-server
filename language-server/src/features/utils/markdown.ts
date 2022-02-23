import { Injectable, TypeInfo } from '@rwxml/analyzer'

export function csharpFieldCodeBlock(name: string, accessor: string, type: string) {
  return ['```csharp', `${accessor} ${type} ${name};`, '```'].join('\n')
}

export function classNameCodeBlock(node: Injectable): string {
  const className = node.typeInfo.isGeneric ? genericClassNameToString(node.typeInfo) : node.typeInfo.className
  return ['```csharp', `class ${className}`, '```'].join('\n')
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
