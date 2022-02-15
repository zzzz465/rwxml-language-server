import EventEmitter from 'events'
import { inject, singleton } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { ConnectionToken } from './connection'
import { File } from './fs'
import { About, Dependency } from './mod'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'
import { DependencyRequest, DependencyRequestResponse } from './events'
import assert from 'assert'
import { URI } from 'vscode-uri'
import { DefaultDictionary } from 'typescript-collections'

type Events = Omit<NotificationEvents, 'fileChanged'>

@singleton()
export class DependencyResourceManager {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${DependencyResourceManager.name}] ${info.message}`
  )
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  public readonly event: EventEmitter<Events> = new EventEmitter()

  // Map<packageId, File[]>
  private readonly resourcesMap: Map<string, File[]> = new Map()

  private readonly resources: DefaultDictionary<string, number> = new DefaultDictionary(() => 0)

  constructor(about: About, @inject(ConnectionToken) private readonly connection: Connection) {
    about.event.on('dependencyModsChanged', this.onAboutChanged.bind(this))
  }

  isDependencyFile(uri: string): boolean {
    return this.resources.getValue(uri) > 0
  }

  private markFile(uri: string): void {
    const next = this.resources.getValue(uri) + 1
    this.resources.setValue(uri, next)
  }

  private unmarkFile(uri: string): void {
    const next = this.resources.getValue(uri) - 1
    this.resources.setValue(uri, next >= 0 ? next : 0) // it must be greater than zero
  }

  private onAboutChanged(about: About) {
    this.log.debug(`mod dependencies: ${JSON.stringify(about.modDependencies)}`)
    const added = about.modDependencies.filter((dep) => !this.resourcesMap.has(dep.packageId))

    // quite bad algorithm but expected list size is <= 10 so I'll ignore it.
    const deleted = [...this.resourcesMap.keys()]
      .filter((key) => about.modDependencies.find((dep) => dep.packageId === key))
      .map((key) => about.modDependencies.find((dep) => dep.packageId === key)) as Dependency[]

    this.handleDeletedMods(deleted)
    this.handleAddedMods(added)
  }

  private async handleAddedMods(deps: Dependency[]) {
    this.log.debug(`request dependencies (added): ${JSON.stringify(deps)}`)

    const requests = deps.map((dep) =>
      this.connection.sendRequest(DependencyRequest, { packageId: dep.packageId }, undefined)
    )

    try {
      const responses = await Promise.all(requests)

      for (const res of responses) {
        if (res.error) {
          this.log.error(res.error)
          continue
        }

        this.handleAddResponse(res)
      }
    } catch (err) {
      this.log.error(err)
    }
  }

  private async handleAddResponse(res: DependencyRequestResponse): Promise<void> {
    assert(!res.error)
    log.debug(`processing add response, packageId: ${res.packageId}, files: ${(JSON.stringify(res.uris), null, 2)}`)

    const files = res.uris.map((uri) =>
      File.create({ uri: URI.parse(uri), ownerPackageId: res.packageId, readonly: true })
    )

    this.resourcesMap.set(res.packageId, files)

    for (const file of files) {
      this.markFile(file.uri.toString())
      this.event.emit('fileAdded', file)
    }
  }

  private handleDeletedMods(deps: Dependency[]) {
    this.log.debug(`deleted dependencies: ${JSON.stringify(deps)}`)

    for (const dep of deps) {
      const files = this.resourcesMap.get(dep.packageId)
      if (!files) {
        this.log.error(`trying to remove dependency ${dep.packageId}, which is not registered`)
        continue
      }

      for (const file of files) {
        this.unmarkFile(file.uri.toString())
        this.event.emit('fileDeleted', file.uri.toString())
      }
    }
  }
}
