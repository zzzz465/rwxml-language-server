import { FileType, Uri } from 'vscode'
import { Mod } from './mod'
import vscode from 'vscode'
import path from 'path'
import { AsEnumerable } from 'linq-es2015'
import { inject, singleton } from 'tsyringe'
import { PathStore } from '.'

@singleton()
export class ModManager {
  private readonly _mods: Map<string, Mod> = new Map()
  get mods() {
    return [...this._mods.values()]
  }

  private _initialized = false
  get initialized() {
    return this._initialized
  }

  get directoryUris(): vscode.Uri[] {
    return this.pathStore.dependencyDirectories.map((fsPath) => vscode.Uri.file(fsPath))
  }

  constructor(@inject(PathStore.token) private readonly pathStore: PathStore) {
    console.log(`ModManager watching directories: ${this.directoryUris}`)
  }

  async init() {
    if (this.initialized) {
      throw new Error('DependencyManager is already initialized.')
    }

    for (const uri of this.directoryUris) {
      const { mods, errors } = await loadModFromDirectroy(uri)
      for (const mod of mods) {
        this._mods.set(mod.about.packageId, mod)
      }

      if (errors.length > 0) {
        console.error(`cannot create ${errors.length} Mod from directory ${decodeURIComponent(uri.toString())}`)
        for (const err of errors) {
          console.error(err)
        }
      }
    }

    this._initialized = true
  }

  /**
   * @deprecated
   * @param packageIds
   * @returns
   */
  getDependencies(packageIds: string[]): { [packageId: string]: Mod | undefined } {
    const ret: { [packageId: string]: Mod | undefined } = {}

    for (const pkgId of packageIds) {
      ret[pkgId] = this._mods.get(pkgId)
    }

    return ret
  }

  getMod(packageId: string): Mod | undefined {
    return this._mods.get(packageId)
  }
}

async function loadModFromDirectroy(directory: Uri) {
  const dirs = await vscode.workspace.fs.readDirectory(directory)

  const modsPromise = AsEnumerable(dirs)
    .Where(([_, type]) => type === FileType.Directory)
    .Select(([name]) => {
      const modDir = Uri.file(path.resolve(directory.fsPath, name))
      return Mod.create(modDir)
    })
    .Select((p) => p.then((mod) => mod).catch((err) => new Error(err)))
    .ToArray()

  const resolved = await Promise.all(modsPromise)

  const mods = resolved.filter((mod) => mod instanceof Mod) as Mod[]
  const errors = resolved.filter((mod) => mod instanceof Error) as Error[]

  return { mods, errors }
}
