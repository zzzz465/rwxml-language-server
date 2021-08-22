import { Uri } from 'vscode'
import vscode from 'vscode'
import { Writable } from '../types/writable'
import XMLParser from 'htmlparser2'
import { Document } from 'domhandler'
import cheerio from 'cheerio'

export interface ModDependency {
  readonly packageId: string
}

export class About {
  static async load(uri: Uri): Promise<About> {
    const raw = await vscode.workspace.fs.readFile(uri)
    const xmlText = Buffer.from(raw).toString()
    const document = XMLParser.parseDocument(xmlText, { xmlMode: true })

    return await About.create(uri, document)
  }

  static async create(uri: Uri, document: Document): Promise<About> {
    const about = new About() as Writable<About>
    const $ = cheerio.load(document)

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
