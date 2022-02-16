import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import winston from 'winston'
import { LoadFolder } from '../mod/loadfolders'
import { ProjectManager } from '../projectManager'
import { HoverProvider } from './hover'

@tsyringe.registry([
  {
    token: Provider.token,
    useClass: HoverProvider,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
])
export abstract class Provider {
  static readonly token = Symbol('LanguageFeatureProviderToken')

  constructor(private readonly loadFolder: LoadFolder, private readonly projectManager: ProjectManager) {}

  abstract listen(connection: ls.Connection): void
  protected abstract getLogger(): winston.Logger

  protected getProjects(uri: string | URI) {
    const versions = this.getVersions(uri)

    return versions.map((ver) => this.projectManager.getProject(ver))
  }

  protected getVersions(uri: string | URI) {
    if (typeof uri === 'string') {
      uri = URI.parse(uri)
    }

    const versions = this.loadFolder.isBelongsTo(uri)

    return versions
  }

  protected wrapExceptionStackTraces<P, R>(func: (arg: P) => Promise<R>): (arg: P) => Promise<R | undefined> {
    return async (arg: P) => {
      try {
        return await func(arg)
      } catch (e: unknown) {
        this.getLogger().error(JSON.stringify(e, null, 2))
      }
    }
  }

  static listenAll(connection: ls.Connection): void {
    const providers = tsyringe.container.resolveAll<Provider>(Provider.token)
    for (const provider of providers) {
      provider.listen(connection)
    }
  }
}
