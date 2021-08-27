jest.mock('vscode', () => ({}), { virtual: true })

import { URI } from 'vscode-uri'
import path from 'path'
import { About, ModDependency } from '../../../mod'

import exampleAboutFile from './About.xml'
import { xml } from '../../../utils'
const exampleAboutFileUri = URI.file(path.resolve(__dirname, 'About.xml'))

describe('About test', () => {
  test('About.create should create About from valid xml file', async () => {
    const $ = xml.parse(exampleAboutFile)
    const about = await About.create(exampleAboutFileUri, $)

    expect(about.aboutXMLFile).toEqual(exampleAboutFileUri)
    expect(about.author).toEqual('AhnDemi')
    expect(about.name).toEqual('Paniel the Automata Beta 1.3')
    expect(about.packageId).toEqual('AhnDemi.PanieltheAutomataBetatwo')
    expect(about.supportedVersions).toEqual(['1.3'])

    const expectedDependencies: ModDependency[] = [
      {
        packageId: 'erdelf.HumanoidAlienRaces',
      },
      {
        packageId: 'brrainz.harmony',
      },
      {
        packageId: 'goudaquiche.MoharFramework',
      },
    ]

    expect(about.modDependencies).toEqual(expectedDependencies)
  })
})
