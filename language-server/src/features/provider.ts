import { container, Lifecycle, registry } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { HoverProvider } from './hover'

export interface Provider {
  listen(connection: Connection): void
}

@registry([
  {
    token: Provider.token,
    useClass: HoverProvider,
    options: { lifecycle: Lifecycle.Singleton },
  },
])
export abstract class Provider {
  static readonly token = Symbol('LanguageFeatureProviderToken')

  static listenAll(connection: Connection): void {
    const providers = container.resolveAll<Provider>(Provider.token)
    for (const provider of providers) {
      provider.listen(connection)
    }
  }
}
