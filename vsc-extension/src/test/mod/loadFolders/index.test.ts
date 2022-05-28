import path from 'path'
import 'reflect-metadata'
import { URI } from 'vscode-uri'
import { LoadFolder } from '../../../mod'
import { mockVsCode } from '../../utils'

mockVsCode()

const loadFileUri = URI.file(path.resolve(__dirname, 'LoadFolders.xml'))

describe('LoadFolder test', () => {
  test('LoadFolder should parse loadfolder as is if version is defined.', async () => {
    const loadFolder = await LoadFolder.Load(loadFileUri)

    const ver1_2 = loadFolder.getProjectWorkspace('1.2').relativePaths
    expect(ver1_2).toEqual(['/', 'Current'].sort())

    const ver1_3 = loadFolder.getProjectWorkspace('1.3').relativePaths
    expect(ver1_3).toEqual(['/', 'Current'].sort())
  })

  test('loadfolder should return default workspace if not exists', async () => {
    const loadFolder = await LoadFolder.Load(loadFileUri)

    const ver1_0 = loadFolder.getProjectWorkspace('1.0').relativePaths
    expect(ver1_0.sort()).toEqual(['1.0', '.'].sort())
  })
})
