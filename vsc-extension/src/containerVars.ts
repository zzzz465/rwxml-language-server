import { container } from 'tsyringe'
import { Disposable } from 'vscode'
import { getCoreDirectoryUri, getLocalModDirectoryUri, getWorkshopModsDirectoryUri } from './mod'

export const coreDirectoryKey = Symbol('container key of core directory uri')
export const localDirectoryKey = Symbol('container key of local directory uri')
export const workshopDirectoryKey = Symbol('container key of workshop directory uri')
export const DependencyDirectoriesKey = Symbol('container key of all dependnecy directories uri')
export const languageServerEntryPathKey = Symbol('continer key of language server path (relative to entry)')

// initialize container for global variables
export function initialize(): Disposable {
  initCoreDirectoryUri()
  initLocalDirectoryUri()
  initWorkshopDirectoryUri()
  initLanguageServerEntryPath()

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
  const path = process.env.LANGUAGE_SERVER_ENTRY_PATH

  if (typeof path !== 'string') {
    throw new Error(`language-server path ${path} is invalid.`)
  }

  container.register(languageServerEntryPathKey, { useValue: path })
}
