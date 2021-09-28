import _ from 'lodash'
import { CancellationToken, CancellationTokenSource, Progress, ProgressLocation, Uri, window } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyRequest, DependencyResponse } from '../events'
import { extractTypeInfos } from '../typeInfo'
import { ModManager } from './modManager'
import { RimWorldVersion } from './version'

export interface DependencyMetadata {
  dependencies: Map<string, ModDependency>
}

interface ModDependency {
  defs: Uri[]
  packageId: string
}

type ProgressParams = Progress<{ message?: string; increment?: number }>

class ProgressHelper {
  public static async create(version: RimWorldVersion) {
    const p = new ProgressHelper(version)
    p.disposedPromise = new Promise((res) => {
      if (p.disposed) {
        res(undefined)
      }
    })

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: false,
        title: 'RWXML: Runtime TypeInfo Extraction',
      },
      async (progress) => {
        p.progress = progress
        return p.disposedPromise
      }
    )

    return p
  }

  public cancellationTokenSource?: CancellationTokenSource
  public progress!: ProgressParams
  private disposed = false
  public disposedPromise!: Promise<void>

  get token() {
    if (this.disposed) {
      return undefined
    }

    if (!this.cancellationTokenSource) {
      this.cancellationTokenSource = new CancellationTokenSource()
    }

    return this.cancellationTokenSource?.token
  }

  constructor(public readonly version: RimWorldVersion) {}

  cancel() {
    if (this.cancellationTokenSource) {
      this.cancellationTokenSource.cancel()
      this.cancellationTokenSource.dispose()
      this.cancellationTokenSource = undefined
    }
  }

  dispose() {
    this.cancellationTokenSource?.dispose()
    this.cancellationTokenSource = undefined
    this.disposed = true
  }
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

  private async onDependencyRequest({ version, packageIds }: DependencyRequest) {
    let token: CancellationToken
    let progressHelper = this.progressHelper[version]

    if (progressHelper) {
      if (progressHelper.token) {
        progressHelper.cancel()
        token = progressHelper.token
      } else {
        throw new Error()
      }
    } else {
      progressHelper = await ProgressHelper.create(version)
      if (progressHelper.token) {
        token = progressHelper.token
      }
    }

    console.log(`got XMLDocumentDependecy request, version: ${version}, packageIds: ${packageIds}`)
    const response: DependencyResponse = {
      version,
      typeInfos: [],
      items: [],
    }

    if (version !== '1.3') {
      return response
    }

    // set undefined as any otherwise compiler will throw ts2454: Variable is used before being assigned
    let progress: Progress<{ message?: string; increment?: number }> = undefined as any
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: false,
        title: `v: ${version} running Runtime TypeInfo Extraction...`,
      },
      async (p) => {
        progress = p
        return this
      }
    )

    // callback not called immediately, so wait until variable assignment actually happens.
    await new Promise((res) => {
      if (progress !== undefined) {
        res(undefined)
      }
    })

    const dllUrls: string[] = []
    const dependencyMods = this.modManager.getDependencies(packageIds)
    for (const [pkgId, mod] of Object.entries(dependencyMods)) {
      if (!mod) {
        continue
      }

      progress.report({ message: `loading defs from ${mod.about.name}` })

      const data = await mod.getDependencyFiles(version)
      response.items.push({
        packageId: pkgId,
        defs: data.defs.map((def) => ({ uri: def.uri.toString(), text: def.text })),
        readonly: true,
      })
      dllUrls.push(...data.dlls)
    }

    progress.report({ message: 'extracting TypeInfos from dependencies...' })

    try {
      if (dllUrls.length > 0) {
        const urls = _.uniq(dllUrls) // remove dll duplication
        const typeInfos = await extractTypeInfos(...urls)
        response.typeInfos = typeInfos
      }
    } catch (err) {
      console.error(err)
    }

    progress.report({ message: 'extracting TypeInfos from dependencies...' })

    console.log(`sending ${response.items.length} items...`)

    return response
  }
}
