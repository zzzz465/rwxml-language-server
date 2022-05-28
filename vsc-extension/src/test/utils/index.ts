import fs from 'fs/promises'
import path from 'path'
import { URI } from 'vscode-uri'
import { FileSystem, FileType } from './types'

export function mockVsCode() {
  jest.mock('vscode', mockedVsCode, { virtual: true })
}

function mockedVsCode() {
  const obj: any = {
    Uri: URI,
    workspace: {
      fs: {
        readFile: (uri) => readFile(uri),
        readDirectory: (uri) => loadDirectory(uri),
      } as Partial<FileSystem>,
    },
  }

  return obj
}

async function readFile(uri: URI): Promise<Uint8Array> {
  const buffer = await fs.readFile(uri.fsPath)
  return Uint8Array.from(buffer)
}

async function loadDirectory(uri: URI): Promise<[URI, FileType][]> {
  const paths = await fs.readdir(uri.fsPath)

  const results = await Promise.all(
    paths.map(async (name) => {
      const filePath = path.resolve(uri.fsPath, name)
      const fileUri = URI.file(filePath)
      const stat = await fs.stat(filePath)

      let type: FileType
      if (stat.isDirectory()) {
        type = FileType.Directory
      } else if (stat.isFile()) {
        type = FileType.File
      } else if (stat.isSymbolicLink()) {
        type = FileType.SymbolicLink
      } else {
        type = FileType.Unknown
      }

      return [fileUri, type] as [URI, FileType]
    })
  )

  return results
}
