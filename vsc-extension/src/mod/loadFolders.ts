/* eslint-disable @typescript-eslint/no-namespace */
import { Uri } from 'vscode'
import vscode from 'vscode'
import { xml } from '../utils'
import { CheerioAPI, Node } from 'cheerio'
import { RimWorldVersion } from './version'

type LoadFolderData = {
  [key in RimWorldVersion]: string[]
}

namespace LoadFolderData {
  export function parse($: CheerioAPI): LoadFolderData {
    function predicate(tag: RimWorldVersion) {
      return function (_: number, node: Node): boolean {
        return $(node).parent().prop('name') === tag
      }
    }

    const data: LoadFolderData = {
      'v1.0': $('li')
        .filter(predicate('v1.0'))
        .map((_, node) => $(node).text())
        .toArray(),
      'v1.1': $('li')
        .filter(predicate('v1.1'))
        .map((_, node) => $(node).text())
        .toArray(),
      'v1.2': $('li')
        .filter(predicate('v1.2'))
        .map((_, node) => $(node).text())
        .toArray(),
      'v1.3': $('li')
        .filter(predicate('v1.3'))
        .map((_, node) => $(node).text())
        .toArray(),
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
    return this.data[version]
  }
}
