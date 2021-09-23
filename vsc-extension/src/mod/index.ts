import { Uri } from 'vscode'
import process from 'process'
import { container } from 'tsyringe'
import { ModManager } from './modManager'
import { DependencyDirectoriesKey } from '../containerVars'
import { DependencyManager } from './dependencyManager'
import { LanguageClient } from 'vscode-languageclient'

export * from './about'
export * from './mod'
export * from './loadFolders'
export * from './dependencyManager'

export function initialize() {
  initModManager()
  initDependencyManager()
}

function initModManager() {
  const uris = container.resolveAll(DependencyDirectoriesKey) as Uri[]
  const modManager = new ModManager(uris)
  container.register(ModManager, { useValue: modManager })
}

function initDependencyManager() {
  const client = container.resolve(LanguageClient)
  const modManager = container.resolve(ModManager)
  const dependencyManager = new DependencyManager(modManager)
  dependencyManager.listen(client)

  container.register(DependencyManager, { useValue: dependencyManager })
}

export function getWorkshopModsDirectoryUri(): Uri {
  // TODO: get from config or env or something else...

  // default
  return getDefaultWorkshopModsDirectoryUri()
}

function getDefaultWorkshopModsDirectoryUri(): Uri {
  switch (process.platform) {
    case 'win32':
      return Uri.file('C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\294100')

    case 'darwin':
      throw new Error('platform drawin is not supported YET. please make an issue.')

    case 'linux':
      throw new Error('platform linux is not supported YET. please make an issue.')

    default:
      throw new Error(`current platform: ${process.platform} is not supported.`)
  }
}

export function getCoreDirectoryUri(): Uri {
  // TODO: add custom config

  return getDefaultCoreDirectoryUri()
}

function getDefaultCoreDirectoryUri(): Uri {
  switch (process.platform) {
    case 'win32':
      return Uri.file('C:\\Program Files (x86)\\Steam\\steamapps\\common\\RimWorld\\Data')

    case 'darwin':
      throw new Error('platform drawin is not supported YET. please make an issue.')

    case 'linux':
      throw new Error('platform linux is not supported YET. please make an issue.')

    default:
      throw new Error(`current platform: ${process.platform} is not supported.`)
  }
}

export function getLocalModDirectoryUri(): Uri {
  // TODO: add custom config

  return getDefaultLocalModDirectoryUri()
}

function getDefaultLocalModDirectoryUri(): Uri {
  switch (process.platform) {
    case 'win32':
      return Uri.file('C:\\Program Files (x86)\\Steam\\steamapps\\common\\RimWorld\\Mods')

    case 'darwin':
      throw new Error('platform drawin is not supported YET. please make an issue.')

    case 'linux':
      throw new Error('platform linux is not supported YET. please make an issue.')

    default:
      throw new Error(`current platform: ${process.platform} is not supported.`)
  }
}

export function getRimWorldDLLDirectoryUri(): Uri {
  // TODO: add custom config

  return getDefaultRimWorldDLLDirectoryUri()
}

function getDefaultRimWorldDLLDirectoryUri(): Uri {
  switch (process.platform) {
    case 'win32':
      return Uri.file(String.raw`C:\Program Files (x86)\Steam\steamapps\common\RimWorld\RimWorldWin64_Data\Managed`)

    default:
      throw new Error(`platform ${process.platform} is not supported.`)
  }
}
