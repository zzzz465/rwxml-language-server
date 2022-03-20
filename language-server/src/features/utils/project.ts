import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import { LoadFolder } from '../../mod/loadfolders'
import { ProjectManager } from '../../projectManager'

/**
 * ProjectHelper is a utility class that helps finding projects and versions for a given URI
 */
@tsyringe.injectable()
export class ProjectHelper {
  constructor(protected readonly loadFolder: LoadFolder, protected readonly projectManager: ProjectManager) {}

  getProjects(uri: string | URI) {
    const versions = this.getVersions(uri)

    return versions.map((ver) => this.projectManager.getProject(ver))
  }

  getVersions(uri: string | URI) {
    if (typeof uri === 'string') {
      uri = URI.parse(uri)
    }

    const versions = this.loadFolder.isBelongsTo(uri)

    return versions
  }

  wrapExceptionStackTraces<P, R>(
    func: (arg: P) => Promise<R> | R,
    log?: winston.Logger
  ): (arg: P) => Promise<R | undefined> {
    return async (arg: P) => {
      try {
        return await func(arg)
      } catch (e: unknown) {
        log?.error(JSON.stringify(e, null, 2))
      }
    }
  }
}
