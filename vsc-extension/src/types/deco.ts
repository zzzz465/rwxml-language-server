import { Range } from 'vscode-languageclient'

export const DecoTypes = ['content_defName'] as const

export type DecoType = typeof DecoTypes[number]

export interface DecoItem {
  range: Range
  decoType: DecoType
}
