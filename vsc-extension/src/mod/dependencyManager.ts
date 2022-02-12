import _ from 'lodash'
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

export class DependencyManager {
  private readonly progressHelper: { [version in RimWorldVersion]: ProgressHelper | null } = {
    '1.0': null,
    '1.1': null,
    '1.2': null,
    '1.3': null,
    default: null,
  }

  constructor(private modManager: ModManager) {}

  listen(client: LanguageClient) {
    client.onReady().then(() => {
      client.onRequest(DependencyRequest, this.onDependencyRequest.bind(this))
    })
  }

  private async onDependencyRequest({ version, packageIds, dlls }: DependencyRequest) {
    console.log(`ver: ${version}: DependencyRequest, packageIds: ${packageIds}`)
    const response: DependencyResponse = {
      version,
      typeInfos: [],
      items: [],
    }
    const { helper, token } = await this.getProgressHelper(version)

    const dllUrls: string[] = [...dlls]
    const dependencyMods = this.modManager.getDependencies(packageIds)
    console.log(`ver: ${version}: loading ${Object.values(dependencyMods).length} dependencies...`)
    for (const [pkgId, mod] of Object.entries(dependencyMods)) {
      if (token.isCancellationRequested) {
        return undefined
      }

      if (!mod) {
        continue
      }

      helper.report(`loading defs from ${mod.about.name}`)

      const data = await mod.getDependencyFiles(version)
      response.items.push({
        packageId: pkgId,
        defs: data.defs.map((def) => ({ uri: def.uri.toString(), text: def.text })),
        readonly: true,
      })
      dllUrls.push(...data.dlls)
    }

    helper.report('extracting TypeInfo from dependencies...')

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
    this.disposeProgressHelper(helper)

    return response
  }

  private async getProgressHelper(version: RimWorldVersion) {
    // cancel if exists
    this.progressHelper[version]?.cancel()

    let helper = this.progressHelper[version]
    if (!helper) {
      helper = await ProgressHelper.create(version)
      this.progressHelper[version] = helper
    }

    return { helper, token: helper.token }
  }

  private disposeProgressHelper(helper: ProgressHelper) {
    helper.dispose()
    this.progressHelper[helper.version] = null
  }
}
