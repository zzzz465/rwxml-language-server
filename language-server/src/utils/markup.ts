import { MarkupContent } from 'vscode-languageserver-types'

export function normalizeMarkupContent(input: string | MarkupContent | undefined): MarkupContent | undefined {
  if (!input) {
    return undefined
  }

  if (typeof input === 'string') {
    return {
      kind: 'markdown',
      value: input,
    }
  }

  return {
    kind: 'markdown',
    value: input.value,
  }
}
