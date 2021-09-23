import { EventEmitter } from 'events'
import { AsEnumerable } from 'linq-es2015'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { DependencyRequest, DependencyResponse } from './events'
import { Dependency } from './mod'
import { File } from './fs'
import { RimWorldVersion } from './typeInfoMapManager'

interface ListeningEvents {
  requestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]): void
}

export interface DependencyRequesterEvents {
  dependencyModsResponse(response: DependencyResponse): void
}

export class DependencyRequester {
  public readonly event: EventEmitter<DependencyRequesterEvents> = new EventEmitter()

  constructor(private readonly connection: Connection) {}

  listen(event: EventEmitter<ListeningEvents>) {
    event.on('requestDependencyMods', this.onRequestDependencyMods.bind(this))
  }

  private async onRequestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]) {
    const response = await this.connection.sendRequest(DependencyRequest, {
      version,
      packageIds: dependencies.map((d) => d.packageId),
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
