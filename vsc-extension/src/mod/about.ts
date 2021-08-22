import { Uri } from 'vscode'
import vscode from 'vscode'
import xml2js from 'xml2js'
import { Writable } from '../types/writable'

export interface ModDependency {
  readonly packageId: string
}

function getFirstElementOrDefault(value: any, defaultValue?: any) {
  if (value.length > 0) {
    return value[0]
  } else {
    return defaultValue
  }
}

export class About {
  static async load(uri: Uri): Promise<About> {
    const raw = await vscode.workspace.fs.readFile(uri)
    const xmlText = Buffer.from(raw).toString()
    const obj = await xml2js.parseStringPromise(xmlText)

    return await About.create(uri, obj)
  }

  static async create(uri: Uri, raw: Record<string, any>): Promise<About> {
    const about = new About() as Writable<About>
    const modMetadata = raw.ModMetaData

    about.aboutXMLFile = uri
    about.name = getFirstElementOrDefault(modMetadata.name, '')
    about.author = getFirstElementOrDefault(modMetadata.author, '')
    about.packageId = getFirstElementOrDefault(modMetadata.packageId, '')
    about.supportedVersions = Object.values(modMetadata.supportedVersions).map(({ li }: any) =>
      getFirstElementOrDefault(li, '')
    )
    about.modDependencies = Object.values(modMetadata.modDependencies).map(
      ({ li }: any) =>
        ({
          packageId: getFirstElementOrDefault(li.packageId, ''),
        } as ModDependency)
    )

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
