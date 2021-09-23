import _ from 'lodash'
import { Uri } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyRequest, DependencyResponse } from '../events'
import { extractTypeInfos } from '../typeInfo'
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
      typeInfos: [],
      items: [],
    }

    const dllUrls: string[] = []
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
      })
      dllUrls.push(...data.dlls)
    }

    if (dllUrls.length > 0) {
      const urls = _.uniq(dllUrls) // remove dll duplication
      const typeInfos = await extractTypeInfos(...urls)
      response.typeInfos = typeInfos
    }

    console.log(`sending ${response.items.length} items...`)

    return response
  }
}
