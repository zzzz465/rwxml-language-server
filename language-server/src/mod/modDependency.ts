import EventEmitter from 'events'
import _ from 'lodash'
import * as tsyringe from 'tsyringe'
import { About } from './about'
import { AboutMetadata } from './aboutMetadata'

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

  constructor(private readonly about: About, aboutMetadata: AboutMetadata) {
    about.event.on('aboutChanged', this.onAboutChanged.bind(this))
    aboutMetadata.event.on('aboutMetadataChanged', this.onAboutMetadataChanged.bind(this))
  }

  private onAboutChanged(about: About): void {
    if (_.isEqual(this.aboutModDependencies, about.modDependencies)) {
      return
    }

    this.aboutModDependencies = about.modDependencies

    this.event.emit('dependencyChanged', this)
  }

  protected onAboutMetadataChanged(aboutMetadata: AboutMetadata): void {
    for (const version of this.about.supportedVersions) {
      const item = aboutMetadata.get(version)

      if (item) {
        this.aboutMetadataOptionalModDependencies = item.modDependency?.optional ?? []
      } else {
        this.aboutMetadataOptionalModDependencies = []
      }
    }

    this.event.emit('dependencyChanged', this)
  }
}
