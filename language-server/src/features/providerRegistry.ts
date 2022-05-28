import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { registrations } from '../utils/tsyringe'
import { CodeLens } from './codeLens'
import { DefListRequestHandler } from './commands/defListRequestHandler'
import { ParsedTypeInfoRequestHandler } from './commands/parsedTypeInfoRequest'
import { DecoProvider } from './decorate'
import { DiagnosticsProvider } from './diagnostics/provider'
import { HoverProvider } from './hover/hover'
import { Provider } from './provider'

@tsyringe.registry(
  registrations<Provider>(
    ProviderRegistry.token,
    [HoverProvider, DecoProvider, ParsedTypeInfoRequestHandler, DiagnosticsProvider, DefListRequestHandler, CodeLens],
    { lifecycle: tsyringe.Lifecycle.Singleton }
  )
)
export abstract class ProviderRegistry {
  static readonly token = Symbol('LanguageFeatureProviderToken')

  static listenAll(connection: ls.Connection): void {
    const providers = tsyringe.container.resolveAll<Provider>(ProviderRegistry.token)
    for (const provider of providers) {
      provider.init(connection)
    }
  }
}
