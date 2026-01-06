import AsyncLock from 'async-lock'
import EventEmitter from 'events'
import { either } from 'fp-ts'
import * as LINQ from 'linq-es2015'
import _ from 'lodash'
import * as ono from 'ono'
import * as tsyringe from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import winston from 'winston'
import { ConnectionToken } from '../connection'
import { DependencyRequest, DependencyRequestResponse } from '../events'
import { FileStore } from '../fileStore'
import defaultLogger, { withClass } from '../log'
import { Result } from '../utils/functional/result'
import { About } from './about'
import { AboutMetadata } from './aboutMetadata'

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

  get requiredDependencies(): Dependency[] {
    return this._requiredDependencies
  }

  private _optionalDependencies: Dependency[] = []

  get optionalDependencies(): Dependency[] {
    return this._optionalDependencies
  }

  get dependencies(): Dependency[] {
    return _.uniqBy([...this.requiredDependencies, ...this.optionalDependencies], (x) => x.packageId)
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

  has(uri: string): boolean {
    return LINQ.from(this._resources).Any(([, v]) => v.has(uri))
  }

  async update(requiredDependencies: Dependency[], optionalDependencies: Dependency[]): Promise<ono.ErrorLike | null> {
    const oldDeps = [...this.dependencies]

    this._requiredDependencies = requiredDependencies
    this._optionalDependencies = optionalDependencies

    const [added, deleted] = this.getDepDiff(oldDeps, this.dependencies)

    const errors: ono.ErrorLike[] = []

    for (const dep of added) {
      const res0 = await this.fetchDependencyResources(dep)
      if (either.isLeft(res0)) {
        errors.push(res0.left)
        continue
      }

      const uris = res0.right

      this._resources.set(dep.packageId, new Set(uris))

      for (const uri of uris) {
        const res1 = this.fileStore.load({ uri: URI.parse(uri) })
        if (either.isLeft(res1)) {
          errors.push(res1.left)
        }
      }
    }

    for (const dep of deleted) {
      const uris = this._resources.get(dep.packageId)
      if (!uris) {
        errors.push(ono.ono(`cannot delete dependency because packageId ${dep.packageId} not registered.`))
        continue
      }

      for (const uri of uris) {
        const err = this.fileStore.unload(uri)
        if (err) {
          errors.push(err)
        }
      }

      this._resources.delete(dep.packageId)
    }

    if (errors.length > 0) {
      return ono.ono('one or more errors while updating bag.', errors)
    }

    return null
  }

  private async fetchDependencyResources(dep: Dependency): Promise<Result<string[]>> {
    let res: DependencyRequestResponse
    try {
      res = await this.connection.sendRequest(DependencyRequest, {
        packageId: dep.packageId,
        version: this.version,
      })
    } catch (err) {
      return either.left(ono.ono(err as Error))
    }

    // TODO: do a error handling

    return either.right(res.uris)
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
  private log = winston.createLogger({
    format: winston.format.combine(withClass(ModDependencyBags)),
    transports: [defaultLogger()],
  })

  private readonly dependencyBags: Map<string, DependencyResourceBag> = new Map()

  private supportedVersions: string[] = []

  readonly event = new EventEmitter() as TypedEventEmitter<Events>

  private readonly lock = new AsyncLock()

  constructor(
    private readonly about: About,
    private readonly aboutMetadata: AboutMetadata,
    private readonly fileStore: FileStore,
    @tsyringe.inject(ConnectionToken) private readonly connection: Connection
  ) {
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
      return either.right([bag.requiredDependencies, bag.optionalDependencies])
    }

    return either.left(ono.ono(`dependencyBag of version ${version} is not exists.`))
  }

  /**
   * isDependencyFile() checks given file is marked as dependency.
   * @param version if version is specified, check file exists in that version. otherwise, search in every version.
   */
  isDependencyFile(version: string | null, uri: string): boolean {
    if (version) {
      return !!this.dependencyBags.get(version)?.has(uri)
    } else {
      return LINQ.from(this.dependencyBags).Any(([, v]) => v.has(uri))
    }
  }

  private onAboutChanged(about: About): void {
    if (this.isSupportedVersionChanged(about)) {
      this.supportedVersions = [...about.supportedVersions]
      const res = this.updateDependencyBagList()
      if (either.isLeft(res)) {
        this.log.error(either.left)
        return
      }
    }

    this.lock.acquire(this.update.name, () => {
      this.log.debug('updating state because about.xml is changed.')
      this.update()
    })
  }

  private onAboutMetadataChanged(): void {
    this.lock.acquire(this.update.name, () => {
      this.log.debug('updating state because AboutMetadata is changed.')
      this.update()
    })
  }

  private async update(): Promise<void> {
    this.updateDependencyBagList()

    for (const version of this.supportedVersions) {
      const err = await this.updateVersion(version)
      if (err) {
        this.log.error(`failed updating state. error: ${err}`)
      }
    }

    this.event.emit('dependencyChanged', this)
  }

  private async updateVersion(version: string): Promise<ono.ErrorLike | null> {
    const requiredDeps = this.getRequiredDependencies()
    const optionalDeps = this.getOptionalDependenciesOf(version)

    const bag = this.dependencyBags.get(version)
    if (!bag) {
      return ono.ono(`dependencyBag of version ${version} is not exists.`)
    }

    const err = await bag.update(requiredDeps, optionalDeps)
    if (err) {
      return ono.ono(err, 'cannot update bag.')
    }

    return null
  }

  private getRequiredDependencies(): Dependency[] {
    const deps = [...this.about.modDependencies, { packageId: 'Ludeon.RimWorld' }]

    // dependencies cannot have self as dependency.
    // example: open core with the extension.
    return deps.filter((dep) => dep.packageId !== this.about.packageId)
  }

  private getOptionalDependenciesOf(version: string): Dependency[] {
    const deps = this.aboutMetadata.get(version)?.modDependency?.optional ?? []
    deps.push({ packageId: 'Ludeon.RimWorld.Ideology' })
    deps.push({ packageId: 'Ludeon.RimWorld.Royalty' })
    deps.push({ packageId: 'Ludeon.RimWorld.Biotech' })
    deps.push({ packageId: 'Ludeon.RimWorld.Anomaly' })
    deps.push({ packageId: 'Ludeon.RimWorld.Odyssey' })

    // dependencies cannot have self as dependency.
    return deps.filter((dep) => dep.packageId !== this.about.packageId)
  }

  private isSupportedVersionChanged(about: About): boolean {
    return !_.isEqual(this.supportedVersions, about.supportedVersions)
  }

  private updateDependencyBagList(): Result<[DependencyResourceBag[], DependencyResourceBag[]], Error> {
    const addedBags: DependencyResourceBag[] = []
    const deletedBags: DependencyResourceBag[] = []

    for (const version of this.supportedVersions) {
      if (!this.dependencyBags.has(version)) {
        const bag = new DependencyResourceBag(version, this.connection, this.fileStore)
        this.dependencyBags.set(version, bag)
        addedBags.push(bag)
      }
    }

    for (const [version, bag] of this.dependencyBags) {
      if (!this.supportedVersions.some((ver) => ver === version)) {
        this.dependencyBags.delete(version)
        deletedBags.push(bag)
      }
    }

    return either.right([addedBags, deletedBags])
  }
}
