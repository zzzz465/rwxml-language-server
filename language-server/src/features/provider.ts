import { registry } from 'tsyringe'
import { Connection } from 'vscode-languageserver'

export interface Provider {
  listen(connection: Connection): void
}

@registry([])
export abstract class Provider {
  static readonly token = Symbol('LanguageFeatureProviderToken')
}
