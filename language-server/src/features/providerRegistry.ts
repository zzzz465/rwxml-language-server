import * as tsyringe from 'tsyringe'
import { HoverProvider } from './hover/hover'
import { Provider } from './provider'
import * as ls from 'vscode-languageserver'
import { DecoProvider } from './decorate'
import { ParsedTypeInfoRequestHandler } from './commands/parsedTypeInfoRequest'

@tsyringe.registry([
  {
    token: ProviderRegistry.token,
    useClass: HoverProvider,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: ProviderRegistry.token,
    useClass: DecoProvider,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: ProviderRegistry.token,
    useClass: ParsedTypeInfoRequestHandler,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
])
export abstract class ProviderRegistry {
  static readonly token = Symbol('LanguageFeatureProviderToken')

  static listenAll(connection: ls.Connection): void {
    const providers = tsyringe.container.resolveAll<Provider>(ProviderRegistry.token)
    for (const provider of providers) {
      provider.init(connection)
    }
  }
}
