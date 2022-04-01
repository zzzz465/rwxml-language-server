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

  get requiredDependencies(): Dependency[] {
    return [...requiredDependencies, ...this.aboutModDependencies]
  }

  get optionalDependencies(): Dependency[] {
    return this.aboutMetadataOptionalModDependencies
  }

  get dependencies(): Dependency[] {
    return [...this.requiredDependencies, ...this.optionalDependencies]
  }

  private aboutModDependencies: Dependency[] = []
  private aboutMetadataOptionalModDependencies: Dependency[] = []

  readonly event: EventEmitter<Events> = new EventEmitter()

  constructor(
    private readonly about: About,
    aboutMetadata: AboutMetadata,
    @tsyringe.inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })

    about.event.on('aboutChanged', this.onAboutChanged.bind(this))
    aboutMetadata.event.on('aboutMetadataChanged', this.onAboutMetadataChanged.bind(this))
  }

  private onAboutChanged(about: About): void {
    if (_.isEqual(this.aboutModDependencies, about.modDependencies)) {
      return
    }

    this.aboutModDependencies = about.modDependencies
    this.log.debug('modDependency updated due to about.xml change.')

    this.emitDependencyChanged()
  }

  private onAboutMetadataChanged(aboutMetadata: AboutMetadata): void {
    const optionalDependencies = AsEnumerable(this.about.supportedVersions)
      .Select((version) => aboutMetadata.get(version))
      .Where((item) => item !== null)
      .Cast<MetadataItem>()
      .SelectMany((item) => item.modDependency?.optional ?? [])
      .Distinct((item) => item.packageId)
      .ToArray()

    if (_.isEqual(optionalDependencies, this.aboutMetadataOptionalModDependencies)) {
      return
    }

    this.log.debug('modDependency updated due to aboutMetadata change.')

    this.emitDependencyChanged()
  }

  private emitDependencyChanged(): void {
    this.log.info('ModDependency updated.')
    this.log.info(`required dependencies: ${JSON.stringify(this.requiredDependencies, null, 4)}`)
    this.log.info(`optional dependncies: ${JSON.stringify(this.optionalDependencies, null, 4)}`)

    this.event.emit('dependencyChanged', this)
  }
}
