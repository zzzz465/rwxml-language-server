import { AsEnumerable } from 'linq-es2015'
import { Uri } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { XMLDocumentDependencyRequest, XMLDocumentDependencyResponse } from './events'
import { ModManager } from './mod/modManager'

export interface DependencyMetadata {
  dependencies: Map<string, ModDependency>
}

export interface ModDependency {
  defs: Uri[]
  modId: string
}

export class DependencyManager {
  constructor(private modManager: ModManager) {}

  listen(client: LanguageClient) {
    client.onReady().then(() => {
      client.onRequest(XMLDocumentDependencyRequest, this.onXMLDocumentDependencyRequest.bind(this))
    })
  }

  private async onXMLDocumentDependencyRequest({ version, packageIds }: XMLDocumentDependencyRequest) {
    console.log(`got XMLDocumentDependecy request, version: ${version}, packageIds: ${packageIds}`)
    const response: XMLDocumentDependencyResponse = {
      items: [],
    }

    const dependencyMods = this.modManager.getDependencies(packageIds)
    for (const [pkgId, mod] of Object.entries(dependencyMods)) {
      if (!mod) {
        continue
      }

      const dependencyFiles = await mod.getDependencyFiles(version)
      for (const def of dependencyFiles.defs) {
        response.items.push({
          packageId: pkgId,
          readonly: true,
          uri: def.uri.toString(),
          text: def.text,
        })
      }
    }

    console.log(`sending ${response.items.length} items...`)

    return response
  }
}
  