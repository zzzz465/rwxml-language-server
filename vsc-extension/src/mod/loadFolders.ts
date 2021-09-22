/* eslint-disable @typescript-eslint/no-namespace */
import { Uri } from 'vscode'
import vscode from 'vscode'
import { xml } from '../utils'
import { CheerioAPI, Node } from 'cheerio'
import { RimWorldVersion, RimWorldVersions } from './version'

type LoadFolderData = {
  [key in RimWorldVersion]: string[]
}

namespace LoadFolderData {
  export function parse($: CheerioAPI): LoadFolderData {
    function predicate(tag: string) {
      return function (_: number, node: Node): boolean {
        return $(node).parent().prop('name') === tag
      }
    }

    const data: LoadFolderData = {
      '1.0': $('li')
        .filter(predicate('v1.0'))
        .map((_, node) => $(node).text())
        .toArray(),
      '1.1': $('li')
        .filter(predicate('v1.1'))
        .map((_, node) => $(node).text())
        .toArray(),
      '1.2': $('li')
        .filter(predicate('v1.2'))
        .map((_, node) => $(node).text())
        .toArray(),
      '1.3': $('li')
        .filter(predicate('v1.3'))
        .map((_, node) => $(node).text())
        .toArray(),
      default: [],
    }

    return data
  }
}

export class LoadFolder {
  static async Load(loadFoldersFileUri: Uri) {
    const raw = await vscode.workspace.fs.readFile(loadFoldersFileUri)
    const text = Buffer.from(raw).toString()

    const $ = xml.parse(text)
    const data = LoadFolderData.parse($)

    return new LoadFolder(data)
  }

  constructor(private data: LoadFolderData) {}

  getRequiredPaths(version: RimWorldVersion): string[] {
    console.assert(RimWorldVersions.includes(version), `version: ${version} is not allowed.`)
    return this.data[version] ?? []
  }
}
