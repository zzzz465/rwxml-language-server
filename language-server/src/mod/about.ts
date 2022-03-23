import EventEmitter from 'events'
import { Writable } from '../types'
import deepEqual from 'fast-deep-equal'
import path from 'path'
import { xml } from '../utils'
import { File, XMLFile } from '../fs'
import { NotificationEvents } from '../notificationEventManager'
import { inject, singleton } from 'tsyringe'
import { RimWorldVersion, RimWorldVersionArray } from '../RimWorldVersion'
import * as winston from 'winston'
import _ from 'lodash'
import { LogToken } from '../log'

export interface AboutEvents {
  supportedVersionsChanged(): void
  dependencyModsChanged(about: About): void
}

export interface Dependency {
  readonly packageId: string
  readonly displayName?: string
  readonly steamWorkshopURL?: string
  readonly downloadURL?: string
}

const DLCDependencies: Dependency[] = [
  { packageId: 'Ludeon.RimWorld' },
  { packageId: 'Ludeon.RimWorld.Ideology' },
  { packageId: 'Ludeon.RimWorld.Royalty' },
]

@singleton()
export class About {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${About.name}] ${info.message}`)
  private readonly log: winston.Logger

  readonly event: EventEmitter<AboutEvents> = new EventEmitter()

  private _rawXML = ''
  private _name = ''
  private _author = ''
  private _packageId = ''
  private _supportedVersions: string[] = [] // default , 1.0, 1.1, 1.2, ... (default always exists for fallback)
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

  constructor(@inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  updateAboutXML(text: string) {
    this.log.debug('About.xml changed.')

    this._rawXML = text
    const newVal = this.parseNewXML()

    // add packageId of Core, it is always loaded but not included on About.xml
    if (newVal.modDependencies) {
      newVal.modDependencies = _.uniqBy([...newVal.modDependencies, ...DLCDependencies], (x) => x.packageId)
    }

    this.log.debug(`current project name: ${newVal.name}, packageId: ${newVal.packageId}`)
    this.log.debug(`new dependencies: ${JSON.stringify(newVal.modDependencies, null, 4)}`)

    if (newVal.modDependencies && !deepEqual(this._modDependencies, newVal.modDependencies)) {
      this._modDependencies = newVal.modDependencies
      this.event.emit('dependencyModsChanged', this)
    }

    const versionsDiff = _.xor(this.supportedVersions, newVal.supportedVersions)
    this.log.debug(
      `versions diff: ${JSON.stringify(_.difference(this.supportedVersions, newVal.supportedVersions ?? []), null, 4)}`
    )

    if (versionsDiff.length > 0) {
      this._supportedVersions = newVal.supportedVersions
      this.event.emit('supportedVersionsChanged')
    }

    this._name = newVal.name ?? ''
    this._author = newVal.author ?? ''
    this._packageId = newVal.packageId ?? ''
    this._description = newVal.description ?? ''
    this._loadAfter = newVal.loadAfter ?? []
  }

  private parseNewXML() {
    const $ = xml.parse(this.rawXML)

    const name = $('ModMetaData > name').text()
    const author = $('ModMetaData > author').text()
    const packageId = $('ModMetaData > packageId').text()
    const description = $('ModMetaData > description').text()
    let supportedVersions = $('ModMetaData > supportedVersions > li') // TODO: refactor this
      .map((_, node) => $(node).text())
      .filter((_, str) => RimWorldVersionArray.includes(str as any))
      .toArray() as string[]
    const modDependencies = $('ModMetaData > modDependencies > li')
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
    const loadAfter = $('ModMetaData > loadAfter > li')
      .map((_, node) => $(node).text())
      .toArray()

    // edge case handling
    supportedVersions = _.uniq(['default', ...supportedVersions])

    return {
      name,
      author,
      packageId,
      description,
      loadAfter,
      supportedVersions,
      modDependencies,
    }
  }

  listen(event: EventEmitter<NotificationEvents>) {
    event.on('fileAdded', this.onFileChanged.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    // TODO: implement handler for 'fileDeleted'
    // event.on('fileDeleted')
  }

  private async onFileChanged(file: File) {
    if (isAboutFile(file)) {
      this.log.info(`about file changed, uri: ${file.uri.toString()}`)

      const text = await file.read()
      this.updateAboutXML(text)
    }
  }
}

export function isAboutFile(file: File): file is XMLFile & boolean {
  const fsPath = file.uri.fsPath
  const name = path.basename(path.normalize(fsPath))
  const dirname = path.basename(path.dirname(fsPath))

  return file instanceof XMLFile && dirname.toLowerCase() === 'about' && name.toLowerCase() === 'about.xml'
}
