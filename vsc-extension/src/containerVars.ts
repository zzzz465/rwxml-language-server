import { container } from 'tsyringe'
import { Disposable } from 'vscode'
import * as os from 'os'
import * as path from 'path'
import { getCoreDirectoryUri, getLocalModDirectoryUri, getWorkshopModsDirectoryUri } from './mod'

/*
// initialize container for global variables
export function initialize(): Disposable {
  initCoreDirectoryUri()
  initLocalDirectoryUri()
  initWorkshopDirectoryUri()
  initLanguageServerEntryPath()
  initRimWorldDLLDirectoryPath()

  // TODO: mock disposable, fill this later
  // eslint-disable-next-line @typescript-eslint/no-empty-function
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
    case 'linux': {
      const homeDir = os.homedir()
      const rimWorldDLLDirPath =
        'Library/Application Support/Steam/steamapps/common/RimWorld/RimWorldMac.app/Contents/Resources/Data/Managed'

      return path.join(homeDir, rimWorldDLLDirPath)
    }

    default:
      throw new Error(`platform: ${process.platform} is not supported.`)
  }
}
*/
