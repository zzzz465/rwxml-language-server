import { Uri } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyRequest, DependencyResponse } from '../events'
import { ModManager } from './modManager'

export interface DependencyMetadata {
  dependencies: Map<string, ModDependency>
}

interface ModDependency {
  defs: Uri[]
  packageId: string
}

export class DependencyManager {
  constructor(private modManager: ModManager) {}

  listen(client: LanguageClient) {
    client.onReady().then(() => {
      client.onRequest(DependencyRequest, this.onXMLDocumentDependencyRequest.bind(this))
    })
  }

  private async onXMLDocumentDependencyRequest({ version, packageIds }: DependencyRequest) {
    console.log(`got XMLDocumentDependecy request, version: ${version}, packageIds: ${packageIds}`)
    const response: DependencyResponse = {
      version,
      items: [],
    }

    const dependencyMods = this.modManager.getDependencies(packageIds)
    for (const [pkgId, mod] of Object.entries(dependencyMods)) {
      if (!mod) {
        continue
      }

      const data = await mod.getDependencyFiles(version)
      response.items.push({
        packageId: pkgId,
        defs: data.defs.map((def) => ({ uri: def.uri.toString(), text: def.text })),
        readonly: true,
        typeInfos: data.typeInfos,
      })
    }

    console.log(`sending ${response.items.length} items...`)

    return response
  }
}
