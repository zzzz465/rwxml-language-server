import { xml } from '../utils'
import * as cheerio from 'cheerio'
import EventEmitter from 'events'
import path from 'path'
import { URI } from 'vscode-uri'
import { File, XMLFile } from '../fs'
import { NotificationEvents } from '../notificationEventManager'
import * as LINQ from 'linq-es2015'
import { inject, singleton } from 'tsyringe'
import { RimWorldVersion, RimWorldVersionArray } from '../RimWorldVersion'
import * as winston from 'winston'
import { LogToken } from '../log'
import { About } from './about'
import { ProjectWorkspace } from './projectWorkspace'

const VERSION_REGEX = /v[\d]\.\[\d]$/

// TODO: support on LoadFolder changes.
@singleton()
export class LoadFolder {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${LoadFolder.name}] ${info.message}`)
  private readonly log: winston.Logger

  private _rawXML = ''
  private readonly versionRegex = /.*v{0,1}([\d]\.[\d]).*/

  private _rootDirectory: URI = URI.parse('')
  get rootDirectory() {
    // TODO: make _rootDirectory nullable and if it's null, return root dir based on about.xml
    return this._rootDirectory
  }

  private projectWorkspaces: Map<string, ProjectWorkspace> = new Map()

  constructor(@inject(LogToken) baseLogger: winston.Logger, private readonly about: About) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  getProjectWorkspace(version: string) {
    return this.projectWorkspaces.get(version)
  }

  /**
   * isBelongsTo find matching RimWorld versions from given arg.
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
   */
  getResourcePath(uri: URI, version: RimWorldVersion): string | undefined {
    return this.getProjectWorkspace(version)?.getResourcePath(uri) ?? undefined
  }

  // determine the file belongs to specific rimworld version.
  private isBelongsToVersion(uri: URI, version: string): boolean {
    return this.getProjectWorkspace(version)?.includes(uri) ?? false
  }

  listen(event: EventEmitter<NotificationEvents>) {
    event.on('fileAdded', this.onFileChanged.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    event.on('fileDeleted', this.onFileDeleted.bind(this))
  }

  update(text: string) {
    this._rawXML = text
    this.projectWorkspaces.clear()

    const $ = xml.parse(this._rawXML)
    const workspaces = this.parseLoadFolderXML($('loadFolders'))

    for (const workspace of workspaces) {
      this.projectWorkspaces.set(workspace.version, workspace)
    }

    this.projectWorkspaces.set('default', new ProjectWorkspace('default', this.rootDirectory, ['.']))

    // TODO: emit event
  }

  /**
   * parse <loadFolders> node
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
    const $ = cheerio.load(versionNode)
    const version = $().first().text()
    if (!version.match(VERSION_REGEX)) {
      return null
    }

    const relativePaths = LINQ.from($('li'))
      .Select((x) => cheerio.load(x).text())
      .ToArray()

    return new ProjectWorkspace(version, this._rootDirectory, relativePaths)
  }

  private async onFileChanged(file: File) {
    const uri = file.uri
    if (file instanceof XMLFile && this.isLoadFolderFile(file.uri)) {
      const baseDir = path.dirname(uri.fsPath)
      const baseDirUri = URI.file(baseDir)
      this._rootDirectory = baseDirUri
      const xml = await file.read()

      this.log.info('loadFolder.xml changed.')
      this.update(xml)
    }
  }

  private onFileDeleted(uri: string) {
    if (this.isLoadFolderFile(URI.parse(uri))) {
      // TODO: implement this
      throw new Error('onFileDeleted not implemented.')
    }
  }

  private isLoadFolderFile(uri: URI) {
    const basename = path.basename(uri.fsPath)
    return basename.toLowerCase() === 'loadfolders.xml'
  }
}
