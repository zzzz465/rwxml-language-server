import { CheerioAPI } from 'cheerio'
import vscode, { Uri } from 'vscode'
import { Writable } from '../types/writable'
import { xml } from '../utils'

export interface SerializedAbout {
  readonly name: string
  readonly author: string
  readonly packageId: string
  readonly supportedVersions: string[]
}

export interface ModDependency {
  readonly packageId: string
}

export class About {
  static async load(uri: Uri): Promise<About> {
    const raw = await vscode.workspace.fs.readFile(uri)
    const xmlText = Buffer.from(raw).toString()
    const $ = xml.parse(xmlText)

    return await About.create(uri, $)
  }

  static async create(uri: Uri, $: CheerioAPI): Promise<About> {
    const about = new About() as Writable<About>

    about.aboutXMLFile = uri
    about.name = $('name').text()
    about.author = $('author').text()
    about.packageId = $('ModMetaData > packageId').text()
    about.supportedVersions = $('supportedVersions > li')
      .toArray()
      .map((node) => $(node).text())
    about.modDependencies = $('modDependencies > li > packageId')
      .toArray()
      .map((node) => {
        const packageId = $(node).text()
        return {
          packageId,
        }
      })

    return about
  }

  readonly aboutXMLFile!: Uri
  readonly name!: string
  readonly author!: string
  readonly packageId!: string
  readonly supportedVersions!: string[]
  readonly modDependencies!: ModDependency[]

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}
}
