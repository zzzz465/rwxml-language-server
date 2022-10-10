import * as cheerio from 'cheerio'
import EventEmitter from 'events'
import * as LINQ from 'linq-es2015'
import path from 'path'
import * as tsyringe from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import { FileStore } from '../fileStore'
import { File, XMLFile } from '../fs'
import defaultLogger, { withClass } from '../log'
import { NotificationEventManager, NotificationEvents } from '../notificationEventManager'
import { RimWorldVersion, RimWorldVersionArray } from '../RimWorldVersion'
import { xml } from '../utils'
import jsonStr from '../utils/json'
import { About } from './about'
import { ProjectWorkspace } from './projectWorkspace'

const VERSION_REGEX = /v[\d]\.[\d]$/

type Events = {
  loadFolderChanged(loadFolder: LoadFolder): void
}

// TODO: support on LoadFolder changes.
@tsyringe.singleton()
export class LoadFolder {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(LoadFolder)),
    transports: [defaultLogger()],
  })

  private _rawXML = ''
  private readonly versionRegex = /.*v{0,1}([\d]\.[\d]).*/

  /**
   * filePath is a URI of the current LoadFolder.xml
   */
  private filePath: URI = URI.file('')

  /**
   * rootDirectory is a project root path
   */
  get rootDirectory(): URI {
    // TODO: make _rootDirectory nullable and if it's null, return root dir based on about.xml
    return URI.file(path.dirname(this.filePath.fsPath))
  }

  private projectWorkspaces: Map<string, ProjectWorkspace> = new Map()

  readonly event = new EventEmitter() as TypedEventEmitter<Events>

  constructor(
    private readonly fileStore: FileStore,
    notiEventManager: NotificationEventManager,
    private readonly about: About
  ) {
    about.event.on('aboutChanged', (about) => this.onAboutChanged(about))
    notiEventManager.preEvent.on('fileAdded', (file) => this.onFileChanged(file))
    notiEventManager.preEvent.on('fileChanged', (file) => this.onFileChanged(file))
  }

  getProjectWorkspace(version: string): ProjectWorkspace | null {
    return this.projectWorkspaces.get(version) ?? null
  }

  /**
   * isBelongsTo find matching RimWorld versions from given arg.
   * @deprecated access using getWorkspace()
   */
  isBelongsTo(uri: URI): RimWorldVersion[] {
    const res = RimWorldVersionArray.filter((ver) => ver !== 'default' && this.isBelongsToVersion(uri, ver))

    // might the case where LoadFolders.xml is not valid nor exists.
    if (res.length === 0) {
      const match = this.versionRegex.exec(uri.fsPath)
      if (match && match.length > 0) {
        res.push(match[1] as RimWorldVersion)
      }
    }

    // can't assume version from parent directory names, give it default version instead.
    if (res.length === 0) {
      res.push('default')
    }

    return res
  }

  /**
   * @returns string posix-normalized relative path from Resource directory root
   * returns undefined if uri is not under resource directory, or not valid uri
   * @deprecated access using getProjectWorkspace()
   */
  getResourcePath(uri: URI, version: RimWorldVersion): string | undefined {
    return this.getProjectWorkspace(version)?.getResourcePath(uri) ?? undefined
  }

  /**
   * determine the file belongs to specific rimworld version.
   * @deprecated access using getProjectWorkspace()
   */
  private isBelongsToVersion(uri: URI, version: string): boolean {
    return this.getProjectWorkspace(version)?.includes(uri) ?? false
  }

  listen(event: TypedEventEmitter<NotificationEvents>): void {
    event.on('fileAdded', this.onFileChanged.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    event.on('fileDeleted', this.onFileDeleted.bind(this))
  }

  private newProjectWorkspace(version: string, rootDirectory: URI, relatives?: string[]): ProjectWorkspace {
    relatives = relatives ?? ['.', version]

    return new ProjectWorkspace(version, rootDirectory, relatives)
  }

  /**
   * update() updates this instance, parsing the given text.
   */
  private update(text: string): void {
    this._rawXML = text

    this.projectWorkspaces.clear()

    this.log.silly(`LoadFolder content below.\n${text}\n`)

    const $ = xml.parse(this._rawXML)
    const workspaces = this.parseLoadFolderXML($('loadFolders'))

    for (const workspace of workspaces) {
      // because loadfolder's item is v-prefixed.
      this.projectWorkspaces.set(workspace.version, workspace)
    }

    for (const version of this.about.supportedVersions.filter((v) => !this.projectWorkspaces.has(v))) {
      this.projectWorkspaces.set(version, this.newProjectWorkspace(version, this.rootDirectory))
    }

    this.log.debug(`updated workspaces: ${jsonStr([...this.projectWorkspaces.values()])}`)
    this.log.debug(`default workspace: ${jsonStr(this.getProjectWorkspace('default'))}`)

    this.event.emit('loadFolderChanged', this)
  }

  /**
   * parse <loadFolders> node.
   */
  private parseLoadFolderXML(loadFolders: cheerio.Cheerio<cheerio.Element>): ProjectWorkspace[] {
    return LINQ.from(loadFolders.children())
      .Where((x) => !!x.tagName.match(/v[\d]\.[\d]/))
      .Select((x) => this.parseVersion(x))
      .Where((x) => x !== null)
      .Cast<ProjectWorkspace>()
      .ToArray()
  }

  /**
   * parse<v1.0>, <v1.1>, ... nodes.
   */
  private parseVersion(versionNode: cheerio.Element): ProjectWorkspace | null {
    let version = versionNode.tagName
    if (!version.match(VERSION_REGEX)) {
      return null
    }

    version = version.replace('v', '')

    const $ = cheerio.load(versionNode)

    const relativePaths = LINQ.from($('li'))
      .Select((x) => cheerio.load(x).text())
      .ToArray()

    return new ProjectWorkspace(version, this.rootDirectory, relativePaths)
  }

  private async onFileChanged(file: File): Promise<void> {
    if (file instanceof XMLFile && file.uri.toString() === this.filePath.toString()) {
      const loadFolder = await file.read()
      if (loadFolder instanceof Error) {
        this.log.error(`failed to read LoadFolder.xml. error: ${loadFolder}`)
        return
      }

      this.update(loadFolder)
    }
  }

  private onFileDeleted(uri: string): void {
    if (uri === this.filePath.toString()) {
      this.update('')
    }
  }

  private onAboutChanged(about: About): void {
    const newAboutMetadataFilePath = this.getAboutMetadataFilePathFromAbout(about)
    if (newAboutMetadataFilePath.toString() === this.filePath.toString()) {
      return
    }

    this.filePath = newAboutMetadataFilePath
    this.log.debug(`reloading because About.xml path is changed. new source: ${newAboutMetadataFilePath.toString()}`)
    this.reload()
  }

  private getAboutMetadataFilePathFromAbout(about: About): URI {
    return URI.file(path.resolve(path.dirname(about.filePath.fsPath), '../', 'LoadFolders.xml'))
  }

  /**
   * reload() reloads LoadFolders fetching text from fileStore.
   */
  private async reload(): Promise<void> {
    const file = this.fileStore.get(this.filePath.toString())
    if (!file || !(file instanceof XMLFile)) {
      return this.update('')
    }

    const loadFolder = await file.read()
    if (loadFolder instanceof Error) {
      this.log.error(`failed to read LoadFolder.xml. error: ${loadFolder}`)
      return
    }

    this.update(loadFolder)
  }
}
