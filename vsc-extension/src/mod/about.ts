import { Uri } from 'vscode'

export interface ModDependency {
  readonly packageId: string
}

export class About {
  static async load(uri: Uri): About {
    
  }

  readonly aboutXMLFile!: Uri
  readonly name!: string
  readonly author!: string
  readonly packageId!: string
  readonly supportedVersions!: string[]
  readonly modDependencies!: ModDependency[]

  constructor() {}
}
