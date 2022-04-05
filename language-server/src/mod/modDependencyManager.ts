import EventEmitter from 'events'
import { AsEnumerable } from 'linq-es2015'
import _ from 'lodash'
import * as tsyringe from 'tsyringe'
import winston from 'winston'
import { LogToken } from '../log'
import { About } from './about'
import { AboutMetadata, MetadataItem } from './aboutMetadata'

export interface Dependency {
  readonly packageId: string
  readonly displayName?: string
  readonly steamWorkshopURL?: string
  readonly downloadURL?: string
}

interface Events {
  dependencyChanged(modDependencyManager: ModDependencyManager): void
}

const requiredDependencies = [
  {
    packageId: 'Ludeon.RimWorld',
  },
] as const

/**
 * ModDependencyManager provides dependency (required + optional) of the current workspace.
 */
@tsyringe.singleton()
export class ModDependencyManager {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${ModDependencyManager.name}] ${info.message}`)
  private readonly log: winston.Logger

  /**
   * workspace-wide required dependencies.
   */
  get requiredDependencies(): Dependency[] {
    return [...requiredDependencies, ...this.aboutModDependencies]
  }

  /**
   * workspace-wide optional dependencies.
   */
  get optionalDependencies(): Dependency[] {
    return this.aboutMetadataOptionalModDependencies
  }

  /**
   * workspace-wide dependencies. (required + optional)
   */
  get dependencies(): Dependency[] {
    return [...this.requiredDependencies, ...this.optionalDependencies]
  }

  private aboutModDependencies: Dependency[] = []
  private aboutMetadataOptionalModDependencies: Dependency[] = []

  private supportedVersions: string[] = []

  readonly event: EventEmitter<Events> = new EventEmitter()

  constructor(
    private readonly about: About,
    private readonly aboutMetadata: AboutMetadata,
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
  getDependenciesOf(version: string): [Dependency[], Dependency[]] {
    // TODO: impl this

    return [this.requiredDependencies, this.optionalDependencies]
  }

  private onAboutChanged(about: About): void {
    this.checkSupportedVersionChanged(about)
    this.fetchDependencyModsFromAbout(about)
  }

  private checkSupportedVersionChanged(about: About): void {
    if (_.isEqual(this.supportedVersions, about.supportedVersions)) {
      return
    }

    // need to be updated because supportedVersions might be added.
    this.fetchDependencyModsFromAboutMetadata(this.aboutMetadata)
  }

  private fetchDependencyModsFromAbout(about: About): void {
    if (_.isEqual(this.aboutModDependencies, about.modDependencies)) {
      return
    }

    this.aboutModDependencies = about.modDependencies
    this.log.debug('modDependency updated due to about.xml change.')

    this.emitDependencyChanged()
  }

  private onAboutMetadataChanged(aboutMetadata: AboutMetadata): void {
    this.fetchDependencyModsFromAboutMetadata(aboutMetadata)
  }

  private fetchDependencyModsFromAboutMetadata(aboutMetadata: AboutMetadata): void {
    const optionalDependencies = AsEnumerable(this.about.supportedVersions)
      .Select((version) => aboutMetadata.get(version))
      .Where((item) => !!item)
      .Cast<MetadataItem>()
      .SelectMany((item) => item.modDependency?.optional ?? [])
      .Distinct((item) => item.packageId)
      .ToArray()

    if (_.isEqual(optionalDependencies, this.aboutMetadataOptionalModDependencies)) {
      this.log.debug(
        `aboutMetadata changed but no dependency is changed. deps: ${JSON.stringify(optionalDependencies, null, 4)}`
      )
      return
    }

    this.aboutMetadataOptionalModDependencies = optionalDependencies
    this.log.debug('modDependency updated due to aboutMetadata change.')

    this.emitDependencyChanged()
  }

  private emitDependencyChanged(): void {
    this.log.info('ModDependency updated.')
    this.log.info(
      `required dependencies: ${JSON.stringify(
        this.requiredDependencies.map((dep) => dep.packageId),
        null,
        4
      )}`
    )
    this.log.info(
      `optional dependencies: ${JSON.stringify(
        this.optionalDependencies.map((dep) => dep.packageId),
        null,
        4
      )}`
    )

    this.event.emit('dependencyChanged', this)
  }
}
