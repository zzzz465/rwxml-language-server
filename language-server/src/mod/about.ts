import EventEmitter from 'events'
import _ from 'lodash'
import path from 'path'
import { singleton } from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import { File, XMLFile } from '../fs'
import defaultLogger, { withClass } from '../log'
import { NotificationEvents } from '../notificationEventManager'
import { RimWorldVersionArray } from '../RimWorldVersion'
import { xml } from '../utils'
import { Dependency } from './modDependencyBags'

export type AboutEvents = {
  aboutChanged(about: About): void
}

@singleton()
export class About {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(About)),
    transports: [defaultLogger()],
  })

  readonly event = new EventEmitter() as TypedEventEmitter<AboutEvents>

  private _filePath: URI = URI.parse('')

  get filePath(): URI {
    return this._filePath
  }

  /**
   * return the project root directory URI as the About is the workspace's anchor.
   */
  get rootDirectory(): URI {
    const aboutFilePath = this.filePath.fsPath
    const rootDirPath = path.resolve(path.dirname(aboutFilePath), '../')

    return URI.file(rootDirPath)
  }

  private _rawXML = ''
  private _name = ''
  private _author = ''
  private _packageId = ''
  private _supportedVersions: string[] = [] // default , 1.0, 1.1, 1.2, ... (default always exists for fallback)
  private _description = ''
  private _modDependencies: Dependency[] = []
  private _loadAfter: string[] = [] // contains packageId of other mods

  get name(): string {
    return this._name
  }
  get author(): string {
    return this._author
  }
  get packageId(): string {
    return this._packageId
  }
  get supportedVersions(): string[] {
    return [...this._supportedVersions]
  }
  get description(): string {
    return this._description
  }
  get modDependencies(): Dependency[] {
    return this._modDependencies
  }
  get loadAfter(): string[] {
    return this._loadAfter
  }
  get rawXML(): string {
    return this._rawXML
  }

  updateAboutXML(text: string): void {
    this.log.silly('About.xml changed.')

    this._rawXML = text
    const newVal = this.parseNewXML()

    this._name = newVal.name
    this._author = newVal.author
    this._packageId = newVal.packageId
    this._description = newVal.description
    this._loadAfter = newVal.loadAfter
    this._supportedVersions = newVal.supportedVersions
    this._modDependencies = newVal.modDependencies

    this.event.emit('aboutChanged', this)
  }

  private parseNewXML(): {
    name: string
    author: string
    packageId: string
    description: string
    loadAfter: string[]
    supportedVersions: string[]
    modDependencies: Dependency[]
  } {
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

  listen(event: TypedEventEmitter<NotificationEvents>): void {
    event.on('fileAdded', this.onFileChanged.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    // TODO: implement handler for 'fileDeleted'
    // event.on('fileDeleted')
  }

  private async onFileChanged(file: File): Promise<void> {
    if (isAboutFile(file)) {
      this.log.info('about file changed.')

      if (file.uri.toString() !== this.filePath.toString()) {
        this._filePath = file.uri
        this.log.debug('updating paths because about.xml path is changed.')
        this.log.debug(`about.xml path: ${this.filePath.toString()}`)
        this.log.debug(`rootDirectory path: ${this.rootDirectory.toString()}`)
      }

      const text = await file.read()
      if (text instanceof Error) {
        this.log.error(`failed to read about.xml. error: ${text}`)
        return
      }

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
