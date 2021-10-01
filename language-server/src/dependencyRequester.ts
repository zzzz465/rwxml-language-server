import { EventEmitter } from 'events'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { DependencyRequest, DependencyResponse } from './events'
import { RimWorldVersion } from './typeInfoMapManager'
import { inject, singleton } from 'tsyringe'
import { Project } from './project'

interface ListeningEvents {
  requestDependencyMods(sender: Project): void
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

  private async onRequestDependencyMods(sender: Project) {
    const dependencyPackageIds = sender.about.modDependencies.map((dep) => dep.packageId)
    const dllUris = sender.dllFiles.map((uri) => uri.toString())

    const response = await this.connection.sendRequest(DependencyRequest, {
      version: sender.version,
      packageIds: dependencyPackageIds,
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
}
