import { Uri } from 'vscode'
import process from 'process'

export * from './about'
export * from './mod'
export * from './loadFolders'

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
