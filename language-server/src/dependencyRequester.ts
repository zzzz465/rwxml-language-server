import { EventEmitter } from 'events'
import { AsEnumerable } from 'linq-es2015'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { DependencyRequest, DependencyResponse } from './events'
import { Dependency } from './mod'
import { File } from './fs'
import { RimWorldVersion } from './typeInfoMapManager'
import { container, inject, singleton } from 'tsyringe'
import { ProjectManager } from './projectManager'

interface ListeningEvents {
  requestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]): void
}

export interface DependencyRequesterEvents {
  dependencyModsResponse(response: DependencyResponse): void
}

@singleton()
export class DependencyRequester {
  public readonly event: EventEmitter<DependencyRequesterEvents> = new EventEmitter()

  constructor(@inject('connection') private readonly connection: Connection) {}

  listen(event: EventEmitter<ListeningEvents>) {
    event.on('requestDependencyMods', this.onRequestDependencyMods.bind(this))
  }

  private async onRequestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]) {
    const dllUris = this.getProjectDLLUris(version)

    const response = await this.connection.sendRequest(DependencyRequest, {
      version,
      packageIds: dependencies.map((d) => d.packageId),
      dlls: dllUris,
    })

    // convert encoded string to Uri
    for (const item of response.items) {
      for (const def of item.defs) {
        def.uri = URI.parse(def.uri) as any
      }
    }

    this.event.emit('dependencyModsResponse', response)
  }

  private getProjectDLLUris(version: RimWorldVersion) {
    const projectManager = container.resolve(ProjectManager)
    const project = projectManager.getProject(version)

    return project.dllFiles.map((file) => file.uri.toString())
  }
}
