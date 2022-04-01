import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { ConnectionToken } from './connection'
import { File } from './fs'
import { About } from './mod'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'
import { DependencyRequest, DependencyRequestResponse } from './events'
import { URI } from 'vscode-uri'
import { DefaultDictionary } from 'typescript-collections'
import { LogToken } from './log'
import { Dependency, ModDependency } from './mod/modDependency'

type Events = Omit<NotificationEvents, 'fileChanged'>

@tsyringe.singleton()
export class DependencyResourceManager {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${DependencyResourceManager.name}] ${info.message}`
  )
  private readonly log: winston.Logger

  public readonly event: EventEmitter<Events> = new EventEmitter()

  // Map<packageId, File[]>
  private readonly resourcesMap: Map<string, File[]> = new Map()

  private readonly resources: DefaultDictionary<string, number> = new DefaultDictionary(() => 0)

  constructor(
    modDependency: ModDependency,
    @tsyringe.inject(ConnectionToken) private readonly connection: ls.Connection,
    @tsyringe.inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
    modDependency.event.on('dependencyChanged', this.onModDependencyChanged.bind(this))
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

  private onModDependencyChanged(modDependency: ModDependency) {
    this.log.info('reloading because dependency is changed.')

    const dependencies = modDependency.dependencies
    this.log.debug(`mod dependencies: ${JSON.stringify(dependencies, null, 4)}`)

    const added = dependencies.filter((dep) => !this.resourcesMap.has(dep.packageId))

    // quite bad algorithm but expected list size is <= 10 so I'll ignore it.
    const deleted = [...this.resourcesMap.keys()]
      .filter((key) => !dependencies.find((dep) => dep.packageId === key))
      .map((key) => dependencies.find((dep) => dep.packageId === key)) as Dependency[]

    this.handleDeletedMods(deleted)
    this.handleAddedMods(added)
  }

  private async handleAddedMods(deps: Dependency[]) {
    this.log.info(`added dependencies: ${JSON.stringify(deps, null, 4)}`)

    const requests = deps.map((dep) =>
      this.connection.sendRequest(DependencyRequest, { packageId: dep.packageId }, undefined)
    )

    try {
      const responses = await Promise.all(requests)

      for (const res of responses) {
        if (res.error) {
          this.log.error(`error while requesting mod dependencies. error: ${res.error}`)
          continue
        }

        this.handleAddResponse(res)
      }
    } catch (err) {
      this.log.error(err)
    }
  }

  private async handleAddResponse(res: DependencyRequestResponse): Promise<void> {
    this.log.silly(`dependency file added: ${JSON.stringify(res.uris, null, 4)}`)

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
    this.log.info(`deleted dependencies: ${JSON.stringify(deps, null, 4)}`)

    for (const dep of deps) {
      const files = this.resourcesMap.get(dep.packageId)
      if (!files) {
        this.log.error(`trying to remove dependency ${dep.packageId}, which is not registered.`)
        continue
      }

      this.log.silly(
        `dependency file deleted: ${JSON.stringify(
          files.map((file) => file.uri),
          null,
          4
        )}`
      )

      for (const file of files) {
        this.unmarkFile(file.uri.toString())
        this.event.emit('fileDeleted', file.uri.toString())
      }
    }
  }
}
