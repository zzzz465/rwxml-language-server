import { Writable } from '../types'
import { isSubFileOf, xml } from '../utils'
import { CheerioAPI, Node } from 'cheerio'
import EventEmitter from 'events'
import path from 'path'
import { URI } from 'vscode-uri'
import { File, XMLFile } from '../fs'
import { NotificationEvents } from '../notificationEventManager'
import { AsEnumerable } from 'linq-es2015'
import normalize_path from 'normalize-path'
import { singleton } from 'tsyringe'
import { RimWorldVersion, RimWorldVersionArray } from '../RimWorldVersion'

// TODO: support on LoadFolder changes.
@singleton()
export class LoadFolder {
  private _rawXML = ''
  private readonly versionRegex = /.*v{0,1}([\d]\.[\d]).*/
  private readonly resourceDirs = ['Defs', 'Textures', 'Languages', 'Sounds']

  rootDirectory: URI = URI.file('')

  private '_1.0': URI[] = []
  private '_1.1': URI[] = []
  private '_1.2': URI[] = []
  private '_1.3': URI[] = []

  get '1.0'(): URI[] {
    return [...this['_1.0']]
  }
  get '1.1'(): URI[] {
    return [...this['_1.1']]
  }
  get '1.2'(): URI[] {
    return [...this['_1.2']]
  }
  get '1.3'(): URI[] {
    return [...this['_1.3']]
  }
  get default(): URI[] {
    return [this.rootDirectory]
  }

  updateLoadFolderXML(uri: URI, text: string) {
    this._rawXML = text

    const $ = xml.parse(this._rawXML)

    const newVal = this.parseNewXML($)

    this['_1.0'] = newVal['1.0']
    this['_1.1'] = newVal['1.1']
    this['_1.2'] = newVal['1.2']
    this['_1.3'] = newVal['1.3']
  }

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
    const resourceDirectoryUri = this.getResourceDirectoryOf(uri, version)
    if (resourceDirectoryUri) {
      const relativePath = path.relative(resourceDirectoryUri.fsPath, uri.fsPath)
      const normalized = normalize_path(relativePath)

      return normalized
    }
  }

  // determine the file belongs to specific rimworld version.
  private isBelongsToVersion(uri: URI, version: RimWorldVersion): boolean {
    const root = this.rootDirectory.fsPath
    const child = uri.fsPath

    // check file is under project root directory
    if (!isSubFileOf(root, child)) {
      return false
    }

    // check file is under loadDirectory according to LoadFolders.xml
    if (this.isUnderResourceDirectory(uri, version)) {
      return true
    }

    return false
  }

  isUnderResourceDirectory(uri: URI, version: RimWorldVersion) {
    return !!this.getResourceDirectoryOf(uri, version)
  }

  getResourceDirectoryOf(uri: URI, version: RimWorldVersion) {
    const loadDirs = this[version]
    for (const dir of loadDirs) {
      const resourcePaths = this.getResourceDirectories(dir)
      for (const path of resourcePaths) {
        if (isSubFileOf(path.fsPath, uri.fsPath)) {
          return path
        }
      }
    }
  }

  private getResourceDirectories(parent: URI) {
    return AsEnumerable(this.resourceDirs)
      .Select((resPath) => path.join(parent.fsPath, resPath))
      .Select((p) => URI.file(p))
      .ToArray()
  }

  private parseNewXML($: CheerioAPI) {
    function predicate(tag: string) {
      return function (_: number, node: Node): boolean {
        return $(node).parent().prop('name') === tag
      }
    }

    const data: Writable<Pick<LoadFolder, '1.0' | '1.1' | '1.2' | '1.3'>> = {
      '1.0': $('li')
        .filter(predicate('v1.0'))
        .map((_, node) => $(node).text())
        .map((_, p) => this.relativePathToAbsURI(p))
        .toArray(),
      '1.1': $('li')
        .filter(predicate('v1.1'))
        .map((_, node) => $(node).text())
        .map((_, p) => this.relativePathToAbsURI(p))
        .toArray(),
      '1.2': $('li')
        .filter(predicate('v1.2'))
        .map((_, node) => $(node).text())
        .map((_, p) => this.relativePathToAbsURI(p))
        .toArray(),
      '1.3': $('li')
        .filter(predicate('v1.3'))
        .map((_, node) => $(node).text())
        .map((_, p) => this.relativePathToAbsURI(p))
        .toArray(),
    }

    return data
  }

  private relativePathToAbsURI(relativePath: string) {
    const root = this.rootDirectory.fsPath
    const absPath = path.join(root, relativePath)

    return URI.file(absPath)
  }

  listen(event: EventEmitter<NotificationEvents>) {
    event.on('fileAdded', this.onFileChanged.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    event.on('fileDeleted', this.onFileDeleted.bind(this))
  }

  private async onFileChanged(file: File) {
    const uri = file.uri
    if (file instanceof XMLFile && this.isLoadFolderFile(file.uri)) {
      const baseDir = path.dirname(uri.fsPath)
      const baseDirUri = URI.file(baseDir)
      this.rootDirectory = baseDirUri
      const xml = await file.read()
      this.updateLoadFolderXML(file.uri, xml)
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
