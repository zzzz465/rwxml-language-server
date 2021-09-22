import { mockVsCode } from '../../utils'
mockVsCode()

import { URI } from 'vscode-uri'
import path from 'path'
import { LoadFolder } from '../../../mod'

const loadFileUri = URI.file(path.resolve(__dirname, 'LoadFolders.xml'))

describe('LoadFolder test', () => {
  test('LoadFolder should be created on valid files', async () => {
    const loadFolder = await LoadFolder.Load(loadFileUri)

    const ver1_0 = loadFolder.getRequiredPaths('1.0')
    expect(ver1_0.length).toEqual(0)

    const ver1_2 = loadFolder.getRequiredPaths('1.2')
    expect(ver1_2).toEqual(['/', 'Current'])

    const ver1_3 = loadFolder.getRequiredPaths('1.3')
    expect(ver1_3).toEqual(['/', 'Current'])
  })
})
