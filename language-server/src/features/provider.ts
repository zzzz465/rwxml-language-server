import { container, Lifecycle, registry } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import winston from 'winston'
import { HoverProvider } from './hover'

@registry([
  {
    token: Provider.token,
    useClass: HoverProvider,
    options: { lifecycle: Lifecycle.Singleton },
  },
])
export abstract class Provider {
  static readonly token = Symbol('LanguageFeatureProviderToken')

  abstract listen(connection: Connection): void
  protected abstract getLogger(): winston.Logger

  protected wrapExceptionStackTraces<P, R>(func: (arg: P) => Promise<R>): (arg: P) => Promise<R | undefined> {
    return async (arg: P) => {
      try {
        return await func(arg)
      } catch (e: unknown) {
        this.getLogger().error(JSON.stringify(e, null, 2))
      }
    }
  }

  static listenAll(connection: Connection): void {
    const providers = container.resolveAll<Provider>(Provider.token)
    for (const provider of providers) {
      provider.listen(connection)
    }
  }
}
