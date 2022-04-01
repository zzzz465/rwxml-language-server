import EventEmitter from 'events'
import _ from 'lodash'
import * as tsyringe from 'tsyringe'
import { RimWorldVersionToken } from '../RimWorldVersion'
import { About } from './about'
import { AboutMetadata } from './aboutMetadata'

const DLCDependencies: Dependency[] = [
  { packageId: 'Ludeon.RimWorld' },
  { packageId: 'Ludeon.RimWorld.Ideology' },
  { packageId: 'Ludeon.RimWorld.Royalty' },
]

export interface Dependency {
  readonly packageId: string
  readonly displayName?: string
  readonly steamWorkshopURL?: string
  readonly downloadURL?: string
}

interface Events {
  dependencyChanged(modDependency: ModDependency): void
}

/**
 * ModDependency provides dependency (required + optional) of the current project.
 */
@tsyringe.injectable()
export class ModDependency {
  get requiredDependencies(): Dependency[] {
    return this.aboutModDependencies
  }

  get optionalDependencies(): Dependency[] {
    throw new Error('not implemented.')
  }

  get dependencies(): Dependency[] {
    return [...this.requiredDependencies, ...this.optionalDependencies]
  }

  private aboutModDependencies: Dependency[] = []
  private aboutMetadataOptionalModDependencies: Dependency[] = []

  readonly event: EventEmitter<Events> = new EventEmitter()

  constructor(
    @tsyringe.inject(RimWorldVersionToken) private readonly version: string,
    about: About,
    aboutMetadata: AboutMetadata
  ) {
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

  private onAboutMetadataChanged(aboutMetadata: AboutMetadata): void {
    const item = aboutMetadata.get(this.version)
    if (item) {
      this.aboutMetadataOptionalModDependencies = item.modDependency?.optional ?? []
    } else {
      this.aboutMetadataOptionalModDependencies = []
    }

    this.event.emit('dependencyChanged', this)
  }
}
