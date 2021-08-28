import { FileType, Uri } from 'vscode'
import { Mod } from './mod'
import vscode from 'vscode'
import path from 'path'
import { AsEnumerable } from 'linq-es2015'

export class ModManager {
  private readonly mods: Map<string, Mod> = new Map()
  private _initialized = false
  get initialized() {
    return this._initialized
  }

  constructor(public readonly directoryUris: Uri[]) {}

  async init() {
    if (this.initialized) {
      throw new Error('DependencyManager is already initialized.')
    }

    for (const uri of this.directoryUris) {
      const { mods, errors } = await loadModFromDirectroy(uri)
      for (const mod of mods) {
        this.mods.set(mod.about.packageId, mod)
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

  getDependencies(packageIds: string): { [packageId: string]: Mod | undefined } {
    const ret: { [packageId: string]: Mod | undefined } = {}

    for (const pkgId of packageIds) {
      ret[pkgId] = this.mods.get(pkgId)
    }

    return ret
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
