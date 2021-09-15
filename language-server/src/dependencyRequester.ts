import { EventEmitter } from 'events'
import { AsEnumerable } from 'linq-es2015'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { File, XMLDocumentDependencyRequest } from './fs'
import { Dependency } from './mod'
import { RimWorldVersion } from './typeInfoMapManager'

interface ListeningEvents {
  requestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]): void
}

export interface DependencyRequesterEvents {
  dependencyModsResponse(files: File[]): void
}

export class DependencyRequester {
  public readonly event: EventEmitter<DependencyRequesterEvents> = new EventEmitter()

  constructor(private readonly connection: Connection) {}

  listen(event: EventEmitter<ListeningEvents>) {
    event.on('requestDependencyMods', this.onRequestDependencyMods.bind(this))
  }

  private async onRequestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]) {
    const { items } = await this.connection.sendRequest(XMLDocumentDependencyRequest, {
      version,
      packageIds: dependencies.map((d) => d.packageId),
    })

    const files = AsEnumerable(items)
      .Select(
        (item) =>
          ({
            uri: URI.parse(item.uri),
            ownerPackageId: item.packageId,
            readonly: item.readonly,
            text: item.text,
          } as File.FileCreateParameters)
      )
      .Select((item) => File.create(item))
      .ToArray()

    this.event.emit('dependencyModsResponse', files)
  }
}
