import { LanguageClient } from 'vscode-languageclient'

export const ProviderSymbol = Symbol()

export interface Provider {
  listen(client: LanguageClient): void
}
