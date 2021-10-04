import { container } from 'tsyringe'
import { Disposable } from 'vscode'
import { getCoreDirectoryUri, getLocalModDirectoryUri, getWorkshopModsDirectoryUri } from './mod'

export const coreDirectoryKey = Symbol('container key of core directory uri')
export const localDirectoryKey = Symbol('container key of local directory uri')
export const workshopDirectoryKey = Symbol('container key of workshop directory uri')
export const DependencyDirectoriesKey = Symbol('container key of all dependnecy directories uri')
export const languageServerModuleRelativePathKey = Symbol('continer key of language server path (relative to entry)')
export const RimWorldDLLDirectoryKey = Symbol('container key of Directory URL containing RimWorld DLLs')

// initialize container for global variables
export function initialize(): Disposable {
  initCoreDirectoryUri()
  initLocalDirectoryUri()
  initWorkshopDirectoryUri()
  initLanguageServerEntryPath()
  initRimWorldDLLDirectoryPath()

  // TODO: mock disposable, fill this later
  return { dispose: () => {} }
}

function initCoreDirectoryUri() {
  const uri = getCoreDirectoryUri()
  container.register(coreDirectoryKey, { useValue: uri })
  container.register(DependencyDirectoriesKey, { useValue: uri })
}

function initLocalDirectoryUri() {
  const uri = getLocalModDirectoryUri()
  container.register(localDirectoryKey, { useValue: uri })
  container.register(DependencyDirectoriesKey, { useValue: uri })
}

function initWorkshopDirectoryUri() {
  const uri = getWorkshopModsDirectoryUri()
  container.register(workshopDirectoryKey, { useValue: uri })
  container.register(DependencyDirectoriesKey, { useValue: uri })
}

function initLanguageServerEntryPath() {
  const path = process.env.LANGUAGE_SERVER_MODULE_PATH_RELATIVE

  if (typeof path !== 'string') {
    throw new Error(`language-server path ${path} is invalid.`)
  }

  container.register(languageServerModuleRelativePathKey, { useValue: path })
}

function initRimWorldDLLDirectoryPath() {
  const path = getRimWorldDLLDirectoryPath()

  if (typeof path !== 'string') {
    throw new Error(`DLL Path ${path} is invalid.`)
  }

  container.register(RimWorldDLLDirectoryKey, { useValue: path })
}

function getRimWorldDLLDirectoryPath() {
  return getDefaultRimWorldDLLDirectoryPath()
}

function getDefaultRimWorldDLLDirectoryPath() {
  switch (process.platform) {
    case 'win32':
      return String.raw`C:\Program Files (x86)\Steam\steamapps\common\RimWorld\RimWorldWin64_Data\Managed`

    case 'darwin':
    case 'linux':
      return ''

    default:
      throw new Error(`platform: ${process.platform} is not supported.`)
  }
}
