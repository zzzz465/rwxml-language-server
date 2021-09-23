import { DependencyContainer } from 'tsyringe'
import { Disposable } from 'vscode'
import { getCoreDirectoryUri, getLocalModDirectoryUri, getWorkshopModsDirectoryUri } from './mod'

export const coreDirectoryKey = Symbol('container key of core directory uri')
export const localDirectoryKey = Symbol('container key of local directory uri')
export const workshopDirectoryKey = Symbol('container key of workshop directory uri')
export const DependencyDirectoriesKey = Symbol('container key of all dependnecy directories uri')
export const languageServerEntryPathKey = Symbol('continer key of language server path (relative to entry)')

// initialize container for global variables
export function initialize(container: DependencyContainer): Disposable {
  initCoreDirectoryUri(container)
  initLocalDirectoryUri(container)
  initWorkshopDirectoryUri(container)
  initLanguageServerEntryPath(container)

  // TODO: mock disposable, fill this later
  return { dispose: () => {} }
}

function initCoreDirectoryUri(container: DependencyContainer) {
  const uri = getCoreDirectoryUri()
  container.register(coreDirectoryKey, { useValue: uri })
  container.register(DependencyDirectoriesKey, { useValue: uri })
}

function initLocalDirectoryUri(container: DependencyContainer) {
  const uri = getLocalModDirectoryUri()
  container.register(localDirectoryKey, { useValue: uri })
  container.register(DependencyDirectoriesKey, { useValue: uri })
}

function initWorkshopDirectoryUri(container: DependencyContainer) {
  const uri = getWorkshopModsDirectoryUri()
  container.register(workshopDirectoryKey, { useValue: uri })
  container.register(DependencyDirectoriesKey, { useValue: uri })
}

function initLanguageServerEntryPath(container: DependencyContainer) {
  const path = process.env.LANGUAGE_SERVER_ENTRY_PATH

  if (typeof path !== 'string') {
    throw new Error(`language-server path ${path} is invalid.`)
  }

  container.register(languageServerEntryPathKey, { useValue: path })
}
