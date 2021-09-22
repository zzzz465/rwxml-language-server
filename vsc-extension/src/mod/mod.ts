import { FileType, Uri } from 'vscode'
import { About } from './about'
import vscode from 'vscode'
import { LoadFolder } from './loadFolders'
import path from 'path'
import { RimWorldVersion } from './version'
import glob from 'fast-glob'
import fs from 'fs/promises'
import fsSync from 'fs'
import { AsEnumerable } from 'linq-es2015'
import { extractTypeInfos } from '../typeInfo'

type retType = {
  defs: { uri: Uri; text: string }[]
  typeInfos: unknown
}

export class Mod {
  static async create(rootDirectory: Uri) {
    const fileOrDirsOnRoot = await vscode.workspace.fs.readDirectory(rootDirectory)

    if (!fileOrDirsOnRoot.find(([name, type]) => name.toLowerCase() === 'about' && type === FileType.Directory)) {
      throw new Error(`directory About not exists on directory root ${decodeURIComponent(rootDirectory.toString())}`)
    }

    const aboutPath = vscode.Uri.file(path.resolve(rootDirectory.fsPath, 'About', 'About.xml'))
    const about = await About.load(aboutPath)

    let loadFolder: LoadFolder | null = null
    if (fileOrDirsOnRoot.find(([name, type]) => name.toLowerCase() === 'loadfolders.xml' && type === FileType.File)) {
      const loadFolderPath = vscode.Uri.file(path.resolve(rootDirectory.fsPath, 'LoadFolders.xml'))
      loadFolder = await LoadFolder.Load(loadFolderPath)
    }

    return new Mod(rootDirectory, about, loadFolder ?? undefined)
  }

  constructor(
    public readonly rootDirectory: Uri,
    public readonly about: About,
    public readonly loadFolder?: LoadFolder
  ) {}

  async getDependencyFiles(version?: RimWorldVersion) {
    const ret: retType = {
      defs: [],
      typeInfos: undefined,
    }

    // TODO: refactor this ugly code
    if (version && this.loadFolder) {
      const dirs = this.loadFolder.getRequiredPaths(version) ?? ['/']
      const dependencyFiles = await Promise.all(dirs.map(this.getDependencyFilesFromDirectory.bind(this)))
      ret.defs = AsEnumerable(dependencyFiles)
        .Select((d) => d.defs)
        .SelectMany((d) => d)
        .ToArray()

      return ret
    } else {
      return await this.getDependencyFilesFromDirectory('/')
    }
  }

  isDLCMod(): boolean {
    return this.about.author === 'Ludeon Studios'
  }

  private async getDependencyFilesFromDirectory(relativeURL: string) {
    const ret: retType = {
      defs: [],
      typeInfos: undefined,
    }

    const loadDirectoryRoot = path.join(this.rootDirectory.fsPath, relativeURL)

    // check Defs
    const defsPath = path.resolve(loadDirectoryRoot, 'Defs')
    if (fsSync.existsSync(defsPath)) {
      const defs = await this.getXMLDependencyFiles(Uri.file(defsPath))
      ret.defs = defs
    }

    // check Texture

    // check Sound

    // check Assemblies
    const assembliesPath = path.resolve(loadDirectoryRoot, 'Assemblies')
    if (!this.isDLCMod() && fsSync.existsSync(assembliesPath)) {
      const TypeInfos = await this.getDependencyTypeInfos(Uri.file(assembliesPath))
      ret.typeInfos = TypeInfos as unknown
    }

    // check etc...??

    return ret
  }

  private async getXMLDependencyFiles(defsDirectoryUri: Uri) {
    const urls = await glob('**/*.xml', { cwd: defsDirectoryUri.fsPath, absolute: true })

    const promises = urls.map(async (url) => {
      const text = await fs.readFile(url, { encoding: 'utf-8' })
      return { uri: Uri.file(url), text }
    })

    const files = await Promise.all(promises)

    return files
  }

  private async getDependencyTypeInfos(dllDirectoryUri: Uri): Promise<unknown> {
    const urls = await glob('**/*.dll', { cwd: dllDirectoryUri.fsPath, absolute: true })

    // should provide core dll directory in order to extract Type Infos

    try {
      const typeInfos = await extractTypeInfos(...urls)
      return typeInfos
    } catch (err) {
      console.error(`error while extracting TypeInfo from mod: ${this.about.name}, err: ${err}`)
    }
  }
}
