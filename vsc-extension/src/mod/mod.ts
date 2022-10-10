import path from 'path'
import vscode, { FileType, Uri } from 'vscode'
import { URI } from 'vscode-uri'
import { About } from './about'
import { LoadFolder } from './loadFolders'

export class Mod {
  static async create(rootDirectory: Uri): Promise<Mod | Error> {
    const fileOrDirsOnRoot = await vscode.workspace.fs.readDirectory(rootDirectory)

    if (!fileOrDirsOnRoot.find(([name, type]) => name.toLowerCase() === 'about' && type === FileType.Directory)) {
      return new Error(`about directory not found in ${decodeURIComponent(rootDirectory.toString())}`)
    }

    const aboutPath = vscode.Uri.file(path.resolve(rootDirectory.fsPath, 'About', 'About.xml'))
    const about = await About.load(aboutPath)

    const loadFolderUri = URI.file(path.join(rootDirectory.fsPath, 'LoadFolders.xml'))

    const loadFolder: LoadFolder = new LoadFolder(loadFolderUri)
    try {
      const byteArr = await vscode.workspace.fs.readFile(loadFolderUri)
      loadFolder.load(Buffer.from(byteArr).toString())
    } catch (e) {
      // file not exists.
      // TODO: wrap function and move it to another function.
    }

    return new Mod(rootDirectory, about, loadFolder)
  }

  constructor(
    public readonly rootDirectory: Uri,
    public readonly about: About,
    public readonly loadFolder: LoadFolder
  ) {}

  isLudeonStudiosMod(): boolean {
    return this.about.author === 'Ludeon Studios'
  }

  isDLCMod(): boolean {
    return this.isLudeonStudiosMod()
  }
}
