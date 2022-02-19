import _ from 'lodash'
import * as tsyringe from 'tsyringe'
import * as vscode from 'vscode'
import * as path from 'path'

/**
 * PathStore manages various paths used by program.
 * there's two implementation. win32 / darwin
 */
@tsyringe.registry([])
export abstract class PathStore {
  static readonly token = Symbol(PathStore.name)

  readonly type: 'win32' | 'darwin' | 'unknown' = 'unknown'

  protected abstract defaultRimWorldDirectory(): string
  protected abstract defaultRimWorldDatadirectory(): string
  protected abstract defaultLocalModDirectory(): string
  protected abstract defaultWorkshopModDirectory(): string
  protected abstract defaultRimWorldManagedDirectory(): string
  protected abstract defaultLanguageServerModulePath(): string

  get RimWorldDirectory(): string {
    return vscode.workspace.getConfiguration('rwxml.paths').get<string>('rimWorld', this.defaultRimWorldDirectory())
  }

  get RimWorldDatadirectory(): string {
    return vscode.workspace.getConfiguration('rwxml.paths').get<string>('rimWorldData', this.defaultRimWorldDirectory())
  }

  get LocalModDirectory(): string {
    return vscode.workspace.getConfiguration('rwxml.paths').get<string>('localMods', this.defaultLocalModDirectory())
  }

  get RimWorldManagedDirectory(): string {
    return vscode.workspace
      .getConfiguration('rwxml.paths')
      .get<string>('rimWorldManaged', this.defaultRimWorldManagedDirectory())
  }

  get WorkshopModDirectory(): string {
    return vscode.workspace
      .getConfiguration('rwxml.paths')
      .get<string>('workshopMods', this.defaultWorkshopModDirectory())
  }

  get externalModsDirectory(): string[] {
    return vscode.workspace.getConfiguration('rwxml.paths').get<string[]>('externalMods', [])
  }

  get LanguageServerModulePath(): string {
    return this.defaultRimWorldManagedDirectory()
  }

  get dependencyDirectories(): string[] {
    return _.uniq([
      this.defaultRimWorldDirectory(),
      this.defaultLocalModDirectory(),
      this.defaultWorkshopModDirectory(),
      ...this.externalModsDirectory,
    ])
  }
}

@tsyringe.injectable()
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

@tsyringe.injectable()
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
