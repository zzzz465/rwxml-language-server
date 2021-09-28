import EventEmitter from 'events'
import { RimWorldVersion, RimWorldVersionArray } from '../typeInfoMapManager'
import { Writable } from '../types'
import deepEqual from 'fast-deep-equal'
import path from 'path'
import { xml } from '../utils'
import { File, XMLFile } from '../fs'
import { NotificationEvents } from '../notificationEventManager'
import { singleton } from 'tsyringe'

export interface AboutEvents {
  dependencyModsChanged(oldVal: Dependency[], newVal: Dependency[]): void
}

export interface Dependency {
  readonly packageId: string
  readonly displayName?: string
  readonly steamWorkshopURL?: string
  readonly downloadURL?: string
}

@singleton()
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
    log.debug('About.xml changed.')

    this._rawXML = text
    const newVal = this.parseNewXML()

    // add packageId of Core, it is always loaded but not included on About.xml
    if (newVal.modDependencies && !newVal.modDependencies?.find((d) => d.packageId === 'Ludeon.RimWorld')) {
      newVal.modDependencies.push({
        packageId: 'Ludeon.RimWorld',
      })
    }

    log.debug(`current project name: ${newVal.name}, packageId: ${newVal.packageId}`)
    log.debug(`new dependencies: ${newVal.modDependencies}`)

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

  listen(event: EventEmitter<NotificationEvents>) {
    event.on('workspaceInitialized', this.onWorkspaceInitialized.bind(this))
    event.on('projectFileChanged', this.onProjectFileChanged.bind(this))
  }

  private onProjectFileChanged(file: File) {
    if (isAboutFile(file)) {
      this.updateAboutXML(file.text)
    }
  }

  private onWorkspaceInitialized(files: File[]) {
    for (const file of files) {
      this.onProjectFileChanged(file)
    }
  }
}

export function isAboutFile(file: File): file is XMLFile & boolean {
  const fsPath = file.uri.fsPath
  const name = path.basename(path.normalize(fsPath))
  const dirname = path.basename(path.dirname(fsPath))

  return file instanceof XMLFile && dirname.toLowerCase() === 'about' && name.toLowerCase() === 'about.xml'
}
