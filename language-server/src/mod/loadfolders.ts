import { Writable } from '../types'
import { isSubFileOf, xml } from '../utils'
import { CheerioAPI, Node } from 'cheerio'
import { RimWorldVersion, RimWorldVersionArray } from '../typeInfoMapManager'
import EventEmitter from 'events'
import path from 'path'
import { URI } from 'vscode-uri'
import _ from 'lodash'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LoadFolderEvents {
  // '1.0': ()
}

// TODO: support on LoadFolder changes.
export class LoadFolder {
  private _rawXML = ''

  readonly loadFolderEvents: EventEmitter<LoadFolderEvents> = new EventEmitter()

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

  constructor(public readonly rootDirectory: URI) {}

  updateLoadFolderXML(text: string) {
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
    if (res.length === 0) {
      // if the file doesn't belongs to anywhere, it goes to default version.
      _.remove(res, 'default')
    }

    return res
  }

  // determine the file belongs to specific rimworld version.
  isBelongsToVersion(uri: URI, version: RimWorldVersion): boolean {
    const root = this.rootDirectory.fsPath
    const child = uri.fsPath

    // check file is under project root directory
    if (!isSubFileOf(root, child)) {
      return false
    }

    // check file is under loadDirectory according to LoadFolders.xml
    const loadDirs = this[version]
    for (const dir of loadDirs) {
      if (isSubFileOf(dir.fsPath, uri.fsPath)) {
        return true
      }
    }

    return false
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
}
