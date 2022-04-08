import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { ConnectionToken } from './connection'
import { File } from './fs'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'
import { DependencyRequest, DependencyRequestResponse } from './events'
import { URI } from 'vscode-uri'
import { DefaultDictionary } from 'typescript-collections'
import { LogToken } from './log'
import { Dependency, ModDependencyManager } from './mod/modDependencyManager'
import _ from 'lodash'
import { AsEnumerable } from 'linq-es2015'
import { deserializeError } from 'serialize-error'
import { About } from './mod'
import TypedEventEmitter from 'typed-emitter'
import AsyncLock from 'async-lock'

/**
 * SubResourceStore is a resource store of a specific version.
 * @todo impl this.
 */
class SubResourceStore {
  constructor(public readonly version: string) {}
}

type Events = Omit<NotificationEvents, 'fileChanged'>

// TODO: project 별 class instance 만들어 관리하기
/**
 * @todo refactor this class. !PLEASE!
 */
@tsyringe.singleton()
export class ModDependencyResourceStore {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${ModDependencyResourceStore.name}] ${info.message}`
  )
  private readonly log: winston.Logger

  public readonly event = new EventEmitter() as TypedEventEmitter<Events>

  // DefaultDict<version, Map<packageId, Map<uri, File>>>
  private readonly resourcesMap: DefaultDictionary<string, Map<string, Map<string, File>>> = new DefaultDictionary(
    () => new Map()
  )

  private readonly lock = new AsyncLock()

  constructor(
    private readonly about: About,
    modDependency: ModDependencyManager,
    @tsyringe.inject(ConnectionToken) private readonly connection: ls.Connection,
    @tsyringe.inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
    modDependency.event.on('dependencyChanged', _.debounce(this.onModDependencyChanged.bind(this), 500))
  }

  isDependencyFile(uri: string, version?: string): boolean {
    if (version) {
      return AsEnumerable(this.resourcesMap.getValue(version).values()).Any((x) => x.has(uri))
    } else {
      return AsEnumerable(this.about.supportedVersions)
        .Select((x) => this.resourcesMap.getValue(x))
        .SelectMany((x) => x.values())
        .Any((x) => x.has(uri))
    }
  }

  private onModDependencyChanged(modDependencyManager: ModDependencyManager) {
    const dependencies = modDependencyManager.dependencies
    this.log.debug(`mod dependencies: ${JSON.stringify(dependencies, null, 4)}`)

    const [added, deleted] = this.getModDiff(dependencies)
    if (added.length === 0 && deleted.length === 0) {
      return
    }

    this.log.info('reloading because dependency is changed.')
    this.handleDeletedMods(deleted)
    this.handleAddedMods(added)
  }

  private getModDiff(newDependencies: Dependency[]): [Dependency[], Dependency[]] {
    const added: Dependency[] = []
    const deleted: Dependency[] = []

    for (const version of this.about.supportedVersions) {
      for (const { packageId } of newDependencies) {
        if (!this.resourcesMap.getValue(version).has(packageId)) {
          added.push({ packageId })
        }
      }

      deleted.push(
        ...AsEnumerable(this.resourcesMap.getValue(version).keys())
          .Where((id) => !newDependencies.find((dep) => dep.packageId === id))
          .Where((id) => !added.find((dep) => dep.packageId === id))
          .Select((id) => ({ packageId: id }))
          .Distinct((dep) => dep.packageId)
          .ToArray()
      )
    }

    return [_.uniqBy(added, (x) => x.packageId), _.uniqBy(deleted, (x) => x.packageId)]
  }

  private async handleAddedMods(deps: Dependency[]) {
    await this.lock.acquire('update', async () => {
      this.log.info(
        `added dependencies: ${JSON.stringify(
          deps.map((dep) => dep.packageId),
          null,
          4
        )}`
      )

      for (const version of this.about.supportedVersions) {
        for (const dep of deps) {
          try {
            const res = await this.connection.sendRequest(
              DependencyRequest,
              { version, packageId: dep.packageId },
              undefined
            )

            if (res.error) {
              this.log.error(
                `failed requesting mod dependency of packageId: ${dep.packageId}. error: ${JSON.stringify(
                  deserializeError(res.error),
                  null,
                  4
                )}`
              )
              continue
            }

            this.handleAddResponse(res)
          } catch (e) {
            this.log.error(`unexpected error: ${JSON.stringify(deserializeError(e), null, 4)}`)
          }
        }
      }
    })
  }

  private async handleAddResponse(res: DependencyRequestResponse): Promise<void> {
    this.log.silly(
      `dependency file of "${res.packageId}", version: ${res.version} added: ${JSON.stringify(res.uris, null, 4)}`
    )

    const map = new Map()
    this.resourcesMap.getValue(res.version).set(res.packageId, map)

    const files = res.uris.map((uri) =>
      File.create({ uri: URI.parse(uri), ownerPackageId: res.packageId, readonly: true })
    )

    for (const file of files) {
      map.set(file.uri.toString(), file)
      try {
        this.event.emit('fileAdded', file)
      } catch (e) {
        this.log.error(e)
      }
    }
  }

  private async handleDeletedMods(deps: Dependency[]) {
    await this.lock.acquire('update', () => {
      this.log.info(
        `deleted dependencies: ${JSON.stringify(
          deps.map((dep) => dep.packageId),
          null,
          4
        )}`
      )

      for (const version of this.about.supportedVersions) {
        for (const dep of deps) {
          const valuesIterator = this.resourcesMap.getValue(version).get(dep.packageId)?.values()
          if (!valuesIterator) {
            this.log.error(
              `dependency: "${dep.packageId}" version: "${version}" is not registered but trying to be deleted.`
            )
            continue
          }

          const files = [...valuesIterator]
          if (!files) {
            this.log.error(`trying to remove dependency ${dep.packageId}, which is not registered.`)
            continue
          }

          for (const file of files) {
            this.event.emit('fileDeleted', file.uri.toString())
          }

          this.resourcesMap.getValue(version).delete(dep.packageId)

          this.log.silly(
            `dependency file deleted: ${JSON.stringify(
              files.map((file) => file.uri.toString()),
              null,
              4
            )}`
          )
        }
      }
    })
  }
}
