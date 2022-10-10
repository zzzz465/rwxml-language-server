import _ from 'lodash'
import * as path from 'path'
import * as tsyringe from 'tsyringe'
import * as vscode from 'vscode'

/**
 * PathStore manages various paths used by program.
 * there's two implementation. win32 / darwin
 */
@tsyringe.registry([
  {
    token: PathStore.token,
    useFactory: (c) => {
      switch (process.platform) {
        case 'win32':
          return c.resolve(Win32PathStore)

        case 'darwin':
          return c.resolve(DarwinPathStore)

        default:
          throw new Error(`platform ${process.platform} is not supported. please make an issue on github.`)
      }
    },
  },
])
export abstract class PathStore {
  static readonly token = Symbol(PathStore.name)

  readonly type: 'win32' | 'darwin' | 'unknown' = 'unknown'

  protected abstract defaultRimWorldDirectory(): string
  protected abstract defaultRimWorldDatadirectory(): string
  protected abstract defaultLocalModDirectory(): string
  protected abstract defaultWorkshopModDirectory(): string
  protected abstract defaultRimWorldManagedDirectory(): string
  protected abstract defaultLanguageServerModulePath(): string

  constructor() {
    vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanges.bind(this))
  }

  private async onConfigurationChanges(e: vscode.ConfigurationChangeEvent): Promise<void> {
    if (!e.affectsConfiguration('rwxml.paths')) {
      return
    }

    const response = await vscode.window.showInformationMessage(
      'RWXML: rwxml.paths changed, Please reload VSCode to apply changes.',
      'Reload',
      'Later'
    )

    if (response === 'Reload') {
      await vscode.commands.executeCommand('workbench.action.reloadWindow')
    }
  }

  get RimWorldDirectory(): string {
    return this.getOrDefault(
      vscode.workspace.getConfiguration('rwxml.paths').get<string>('rimWorld'),
      this.defaultRimWorldDirectory()
    )
  }

  get RimWorldDatadirectory(): string {
    return this.getOrDefault(
      vscode.workspace.getConfiguration('rwxml.paths').get<string>('rimWorldData'),
      this.defaultRimWorldDatadirectory()
    )
  }

  get LocalModDirectory(): string {
    return this.getOrDefault(
      vscode.workspace.getConfiguration('rwxml.paths').get<string>('localMods'),
      this.defaultLocalModDirectory()
    )
  }

  get RimWorldManagedDirectory(): string {
    return this.getOrDefault(
      vscode.workspace.getConfiguration('rwxml.paths').get<string>('rimWorldManaged'),
      this.defaultRimWorldManagedDirectory()
    )
  }

  get RimWorldCoreDLLPath(): string {
    return path.join(this.RimWorldManagedDirectory, 'Assembly-CSharp.dll')
  }

  get WorkshopModDirectory(): string {
    return this.getOrDefault(
      vscode.workspace.getConfiguration('rwxml.paths').get<string>('workshopMods'),
      this.defaultWorkshopModDirectory()
    )
  }

  get externalModsDirectory(): string[] {
    return vscode.workspace.getConfiguration('rwxml.paths').get<string[]>('externalMods', [])
  }

  get LanguageServerModulePath(): string {
    return this.defaultLanguageServerModulePath()
  }

  get dependencyDirectories(): string[] {
    return _.uniq([
      this.RimWorldDatadirectory,
      this.LocalModDirectory,
      this.WorkshopModDirectory,
      ...this.externalModsDirectory,
    ])
  }

  // TODO: remove this function
  private getOrDefault(value: string | undefined, defaultValue: string): string {
    if (!value) {
      return defaultValue
    }

    return value
  }
}

@tsyringe.singleton()
export class Win32PathStore extends PathStore {
  readonly type = 'win32'

  protected defaultRimWorldDirectory(): string {
    return 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\RimWorld'
  }

  protected defaultRimWorldDatadirectory(): string {
    return path.join(this.RimWorldDirectory, 'Data')
  }

  protected defaultLocalModDirectory(): string {
    return path.join(this.RimWorldDirectory, 'Mods')
  }

  protected defaultWorkshopModDirectory(): string {
    return 'C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\294100'
  }

  protected defaultRimWorldManagedDirectory(): string {
    return path.join(this.RimWorldDirectory, 'RimWorldWin64_Data', 'Managed')
  }

  protected defaultLanguageServerModulePath(): string {
    return process.env.LANGUAGE_SERVER_MODULE_PATH_RELATIVE as string
  }
}

@tsyringe.singleton()
export class DarwinPathStore extends PathStore {
  readonly type = 'darwin'

  protected defaultRimWorldDirectory(): string {
    return 'Library/Application Support/Steam/Steamapps/common/RimWorld/RimWorldMac.app'
  }

  protected defaultRimWorldDatadirectory(): string {
    return path.join(this.RimWorldDirectory, 'Data')
  }

  protected defaultLocalModDirectory(): string {
    return path.join(this.RimWorldDirectory, 'Mods')
  }

  protected defaultWorkshopModDirectory(): string {
    return 'Library/Application Support/Steam/Steamapps/workshop/content/294100'
  }

  protected defaultRimWorldManagedDirectory(): string {
    return path.join(this.RimWorldDirectory, 'contents', 'Resources', 'Data', 'managed')
  }

  protected defaultLanguageServerModulePath(): string {
    return process.env.LANGUAGE_SERVER_MODULE_PATH_RELATIVE as string
  }
}
