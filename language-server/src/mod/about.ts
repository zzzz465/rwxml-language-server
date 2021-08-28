import EventEmitter from 'events'
import { RimWorldVersion, RimWorldVersionArray } from '../typeInfoMapManager'
import { Writable } from '../types'
import { xml } from '../utils'
import deepEqual from 'fast-deep-equal'

export interface AboutEvents {
  dependencyModsChanged(oldVal: Dependency[], newVal: Dependency[]): void
}

export interface Dependency {
  readonly packageId: string
  readonly displayName?: string
  readonly steamWorkshopURL?: string
  readonly downloadURL?: string
}

export class About {
  eventEmitter: EventEmitter<AboutEvents> = new EventEmitter()

  private _rawXML = ''
  private _name = ''
  private _author = ''
  private _packageId = ''
  private _supportedVersions: RimWorldVersion[] = []
  private _description = ''
  private _modDependencies: Dependency[] = []
  private _loadAfter: string[] = [] // contains packageId of other mods

  get name() {
    return this._name
  }
  get author() {
    return this._author
  }
  get packageId() {
    return this._packageId
  }
  get supportedVersions() {
    return [...this._supportedVersions]
  }
  get description() {
    return this._description
  }
  get modDependencies() {
    return this._modDependencies
  }
  get loadAfter() {
    return this._loadAfter
  }
  get rawXML() {
    return this._rawXML
  }

  updateAboutXML(text: string) {
    this._rawXML = text
    const newVal = this.parseNewXML()

    console.log(`current project name: ${newVal.name}, packageId: ${newVal.packageId}`)
    console.log(`new dependencies: ${newVal.modDependencies}`)

    if (newVal.modDependencies && !deepEqual(this._modDependencies, newVal.modDependencies)) {
      this.eventEmitter.emit('dependencyModsChanged', this._modDependencies, newVal.modDependencies)
      this._modDependencies = newVal.modDependencies
    }

    this._name = newVal.name ?? ''
    this._author = newVal.author ?? ''
    this._packageId = newVal.packageId ?? ''
    this._description = newVal.description ?? ''
  }

  private parseNewXML() {
    const data: Partial<Writable<Omit<About, 'eventEmitter' | 'updateAboutXML'>>> = {}

    const $ = xml.parse(this.rawXML)

    data.name = $('ModMetaData > name').text()
    data.author = $('ModMetaData > author').text()
    data.packageId = $('ModMetaData > packageId').text()
    data.description = $('ModMetaData > description').text()
    data.supportedVersions = $('ModMetaData > supportedVersions > li') // TODO: refactor this
      .map((_, node) => $(node).text())
      .filter((_, str) => RimWorldVersionArray.includes(str as any))
      .toArray() as RimWorldVersion[]
    data.modDependencies = $('ModMetaData > modDependencies > li')
      .map((_, li) => {
        const pkgId = $('packageId', li).text()
        const displayName = $('displayName', li).text()
        const steamWorkshopURL = $('steamWorkshopUrl', li).text()
        const downloadURL = $('downloadUrl', li).text()

        return {
          packageId: pkgId,
          displayName,
          steamWorkshopURL: steamWorkshopURL,
          downloadURL: downloadURL,
        } as Dependency
      })
      .toArray()
    data.loadAfter = $('ModMetaData > loadAfter > li')
      .map((_, node) => $(node).text())
      .toArray()

    return data
  }
}
