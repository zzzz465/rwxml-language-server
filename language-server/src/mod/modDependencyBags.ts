import EventEmitter from 'events'
import _ from 'lodash'
import * as tsyringe from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import winston from 'winston'
import { LogToken } from '../log'
import { About } from './about'
import { AboutMetadata } from './aboutMetadata'
import * as LINQ from 'linq-es2015'
import { Result } from '../types/functional'
import { Connection } from 'vscode-languageserver'
import * as ono from 'ono'
import { DependencyRequest, DependencyRequestResponse } from '../events'
import AsyncLock from 'async-lock'
import { ConnectionToken } from '../connection'
import { FileStore } from '../fileStore'
import { URI } from 'vscode-uri'

/**
무엇을 하려고 하는가?
1. version 에 맞는 Dependency 를 찾아주는 함수/클래스가 필요함.
2. 어느 uri 이 특정 version 의 dependency resource 에 해당하는지 찾아주는 함수/클래스가 필요함.

구현은 어떻게 하는가?
1번 -> about, aboutMetadata 에 진짜 데이터가 있고, 이를 쉽게 가져다 주는 클래스를 만들면 됨.
2번 -> 이게 머리아픔
dependency 리스트와, 각 dep 의 resource list 를 가지고 있는 dependencyBag 를 만든다.
그러고, 이 리스트가 업데이트 될 때 마다, 누군가가 dep 의 resource list 를 가져다가 fileStore 에 읽으라고 요청을 한다.
그럼 이건 누가 해야하는가?
dependencyBag 는 누가 업데이트 해주는가?
컨트롤러는?
 */

/**
 * DependencyBag is a dependency list of a specific version.
 */
class DependencyResourceBag {
  private _requiredDependencies: Dependency[] = []

  get requiredDependencies() {
    return this._requiredDependencies
  }

  private _optionalDependencies: Dependency[] = []

  get optionalDependencies() {
    return this._optionalDependencies
  }

  get dependencies() {
    return [...this.requiredDependencies, ...this.optionalDependencies]
  }

  // Map<packageId, Set<uri>>
  private readonly _resources: Map<string, Set<string>> = new Map()

  get resources(): string[] {
    return LINQ.from(this._resources)
      .SelectMany(([, v]) => [...v])
      .ToArray()
  }

  constructor(
    public readonly version: string,
    private readonly connection: Connection,
    private readonly fileStore: FileStore
  ) {}

  has(uri: string) {
    return LINQ.from(this._resources).Any(([, v]) => v.has(uri))
  }

  async update(requiredDependencies: Dependency[], optionalDependencies: Dependency[]): Promise<ono.ErrorLike | null> {
    const [added0, deleted0] = this.getDepDiff(this.requiredDependencies, requiredDependencies)
    const [added1, deleted1] = this.getDepDiff(this.optionalDependencies, optionalDependencies)

    this._requiredDependencies = requiredDependencies
    this._optionalDependencies = optionalDependencies

    const added = [...added0, ...added1]
    const deleted = [...deleted0, ...deleted1]

    for (const dep of added) {
      const [uris, err] = await this.fetchDependencyResources(dep)
      if (err) {
        return ono.ono(err)
      }

      this._resources.set(dep.packageId, new Set(uris))

      for (const uri of uris) {
        this.fileStore.load({ uri: URI.parse(uri) })
      }
    }

    for (const dep of deleted) {
      this._resources.delete(dep.packageId)
    }

    return null
  }

  private async fetchDependencyResources(dep: Dependency): Promise<Result<string[], ono.ErrorLike>> {
    let res: DependencyRequestResponse
    try {
      res = await this.connection.sendRequest(DependencyRequest, {
        packageId: dep.packageId,
        version: this.version,
      })
    } catch (err) {
      return [null, ono.ono(err as Error)]
    }

    if (res.error) {
      return [null, ono.ono(res.error)]
    }

    return [res.uris, null]
  }

  private getDepDiff(oldDeps: Dependency[], newDeps: Dependency[]): [Dependency[], Dependency[]] {
    const added = LINQ.from(newDeps)
      .Except(oldDeps, (x) => x.packageId)
      .ToArray()

    const deleted = LINQ.from(oldDeps)
      .Except(newDeps, (x) => x.packageId)
      .ToArray()

    return [added, deleted]
  }
}

export interface Dependency {
  readonly packageId: string
  readonly displayName?: string
  readonly steamWorkshopURL?: string
  readonly downloadURL?: string
}

type Events = {
  dependencyChanged(ModDependencyBags: ModDependencyBags): void
}

/**
 * ModDependencyManager provides dependency (required + optional) of the current workspace.
 */
@tsyringe.singleton()
export class ModDependencyBags {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${ModDependencyBags.name}] ${info.message}`)
  private readonly log: winston.Logger

  private readonly dependencyBags: Map<string, DependencyResourceBag> = new Map()

  private supportedVersions: string[] = []

  readonly event = new EventEmitter() as TypedEventEmitter<Events>

  private readonly lock = new AsyncLock()

  constructor(
    private readonly about: About,
    private readonly aboutMetadata: AboutMetadata,
    private readonly fileStore: FileStore,
    @tsyringe.inject(ConnectionToken) private readonly connection: Connection,
    @tsyringe.inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })

    about.event.on('aboutChanged', this.onAboutChanged.bind(this))
    aboutMetadata.event.on('aboutMetadataChanged', this.onAboutMetadataChanged.bind(this))
  }

  /**
   * getDependenciesOf() returns array of dependencies of the specific version.
   * @returns 2 array of dependencies. [Required[], Optional[]]
   */
  getDependenciesOf(version: string): Result<[Dependency[], Dependency[]], ono.ErrorLike> {
    const bag = this.dependencyBags.get(version)
    if (bag) {
      return [[bag.requiredDependencies, bag.optionalDependencies], null]
    }

    return [null, ono.ono(`dependencyBag of version ${version} is not exists.`)]
  }

  private onAboutChanged(about: About): void {
    if (this.isSupportedVersionChanged(about)) {
      this.supportedVersions = [...about.supportedVersions]
      const [, err] = this.updateDependencyBagList()
      if (err) {
        this.log.error(err)
        return
      }
    }

    this.lock.acquire(this.update.name, () => this.update())
  }

  private onAboutMetadataChanged(): void {
    this.lock.acquire(this.update.name, () => this.update())
  }

  private async update(): Promise<ono.ErrorLike | null> {
    this.updateDependencyBagList()

    for (const version of this.supportedVersions) {
      const err = this.updateVersion(version)
      if (err) {
        return err
      }
    }

    this.event.emit('dependencyChanged', this)

    return null
  }

  private async updateVersion(version: string): Promise<ono.ErrorLike | null> {
    const requiredDeps = this.getRequiredDependencies()
    const optionalDeps = this.getOptionalDependenciesOf(version) ?? []

    const bag = this.dependencyBags.get(version)
    if (!bag) {
      return ono.ono(`dependencyBag of version ${version} is not exists.`)
    }

    const err = await bag.update(requiredDeps, optionalDeps)
    if (err) {
      return err
    }

    return null
  }

  private getRequiredDependencies(): Dependency[] {
    return this.about.modDependencies
  }

  private getOptionalDependenciesOf(version: string): Dependency[] | null {
    return this.aboutMetadata.get(version)?.modDependency?.optional ?? null
  }

  private isSupportedVersionChanged(about: About): boolean {
    return _.isEqual(this.supportedVersions, about.supportedVersions)
  }

  private updateDependencyBagList(): Result<[DependencyResourceBag[], DependencyResourceBag[]], Error> {
    const addedBags: DependencyResourceBag[] = []
    const deletedBags: DependencyResourceBag[] = []

    for (const version of this.supportedVersions) {
      if (!this.dependencyBags.has(version)) {
        const bag = new DependencyResourceBag(version, this.connection, this.fileStore)
        this.dependencyBags.set(version, bag)
        addedBags.push(bag)
      } else {
        const bag = this.dependencyBags.get(version)
        if (!bag) {
          return [null, new Error(`dependency bag of version ${version} not exists.`)]
        }

        this.dependencyBags.delete(version)
        deletedBags.push(bag)
      }
    }

    return [[addedBags, deletedBags], null]
  }
}
