import * as tsyringe from 'tsyringe'
import { HoverProvider } from './hover'
import { Provider } from './provider'
import * as ls from 'vscode-languageserver'

@tsyringe.registry([
  {
    token: ProviderRegistry.token,
    useClass: HoverProvider,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
])
export abstract class ProviderRegistry {
  static readonly token = Symbol('LanguageFeatureProviderToken')

  static listenAll(connection: ls.Connection): void {
    const providers = tsyringe.container.resolveAll<Provider>(ProviderRegistry.token)
    for (const provider of providers) {
      provider.listen(connection)
    }
  }
}
