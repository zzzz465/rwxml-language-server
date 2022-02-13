import { Uri } from 'vscode'
import process from 'process'
import os from 'os'
import path from 'path'
import { container } from 'tsyringe'
import { ModManager } from './modManager'
import { DependencyDirectoriesKey } from '../containerVars'

export * from './about'
export * from './mod'
export * from './loadFolders'

export async function initialize() {
  await initModManager()
}

async function initModManager() {
  const uris = container.resolveAll(DependencyDirectoriesKey) as Uri[]
  const modManager = new ModManager(uris)
  await modManager.init()

  container.register(ModManager, { useValue: modManager })
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

    case 'darwin': {
      const homeDir = os.homedir()
      const darwinDefaultSteamPath = 'Library/Application Support/Steam/Steamapps/workshop/content/294100'
      const localModDirectoryPath = path.join(homeDir, darwinDefaultSteamPath)

      return Uri.file(localModDirectoryPath)
    }

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

    case 'darwin': {
      const homeDir = os.homedir()
      const darwinDefaultSteamPath = 'Library/Application Support/Steam/Steamapps/common/RimWorld/RimWorldMac.app/Data'
      const coreModDirectoryPath = path.join(homeDir, darwinDefaultSteamPath)

      return Uri.file(coreModDirectoryPath)
    }

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

    case 'darwin': {
      const homeDir = os.homedir()
      const darwinDefaultSteamPath = 'Library/Application Support/Steam/Steamapps/common/RimWorld/RimWorldMac.app/Mods'
      const localModDirectoryPath = path.join(homeDir, darwinDefaultSteamPath)

      return Uri.file(localModDirectoryPath)
    }

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

    case 'darwin': {
      const homeDir = os.homedir()
      const darwinDefaultDLLPath =
        'Library/Application Support/Steam/Steamapps/common/RimWorld/RimWorldMac.app/contents/Resources/Data/managed'
      const localModDirectoryPath = path.join(homeDir, darwinDefaultDLLPath)

      return Uri.file(localModDirectoryPath)
    }

    default:
      throw new Error(`platform ${process.platform} is not supported.`)
  }
}
