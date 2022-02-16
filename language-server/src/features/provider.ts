import { container, registry } from 'tsyringe'
import { Connection } from 'vscode-languageserver'

export interface Provider {
  listen(connection: Connection): void
}

@registry([])
export abstract class Provider {
  static readonly token = Symbol('LanguageFeatureProviderToken')

  static listenAll(connection: Connection): void {
    const providers = container.resolveAll<Provider>(Provider.token)
    for (const provider of providers) {
      provider.listen(connection)
    }
  }
}
