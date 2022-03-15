import * as ls from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import winston from 'winston'
import { LoadFolder } from '../mod/loadfolders'
import { ProjectManager } from '../projectManager'

export abstract class Provider {
  constructor(protected readonly loadFolder: LoadFolder, protected readonly projectManager: ProjectManager) {}

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

  protected wrapExceptionStackTraces<P, R>(func: (arg: P) => Promise<R> | R): (arg: P) => Promise<R | undefined> {
    return async (arg: P) => {
      try {
        return await func(arg)
      } catch (e: unknown) {
        this.getLogger().error(JSON.stringify(e, null, 2))
      }
    }
  }
}
