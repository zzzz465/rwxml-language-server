import _ from 'lodash'
import { container } from 'tsyringe'
import { Uri } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyRequest, DependencyResponse } from '../events'
import { extractTypeInfos } from '../typeInfo'
import { ModManager } from './modManager'
import { ProgressHelper } from './progressHelper'
import { RimWorldVersion } from './version'

export interface DependencyMetadata {
  dependencies: Map<string, ModDependency>
}

interface ModDependency {
  defs: Uri[]
  packageId: string
}

/**
 * @deprecated resource request is now handled in Provider of each resource, resolved by container.
 */
export class DependencyManager {
  constructor(private modManager: ModManager) {}

  listen(client: LanguageClient) {
    client.onReady().then(() => {
      client.onRequest(DependencyRequest, this.onDependencyRequest.bind(this))
    })
  }

  private async onDependencyRequest({ version, packageIds, dlls }: DependencyRequest) {
    const progressHelper = new ProgressHelper(version)
    const token = progressHelper.token

    console.log(`ver: ${version}: DependencyRequest, packageIds: ${packageIds}`)
    const response: DependencyResponse = {
      version,
      typeInfos: [],
      items: [],
    }

    const dllUrls: string[] = [...dlls]
    const dependencyMods = this.modManager.getDependencies(packageIds)
    console.log(`ver: ${version}: loading ${Object.values(dependencyMods).length} dependencies...`)
    for (const [pkgId, mod] of Object.entries(dependencyMods)) {
      if (token.isCancellationRequested) {
        return
      }

      if (!mod) {
        continue
      }

      progressHelper.report(`loading defs from ${mod.about.name}`)

      const resourceProviders = container.resolveAll<ResourceProvider>(ResourceProviderSymbol)
      for (const provider of resourceProviders) {
        const resources = await provider.getResources(mod, version)
        throw new Error('TODO')
      }
    }

    progressHelper.report('extracting TypeInfo from dependencies...')

    try {
      if (dllUrls.length > 0) {
        const urls = _.uniq(dllUrls) // remove dll duplication
        const typeInfos = await extractTypeInfos(...urls)
        response.typeInfos = typeInfos
      }
    } catch (err) {
      console.error(err)
    }

    console.log(`ver: ${version}: loading completed.`)

    return response
  }
}
