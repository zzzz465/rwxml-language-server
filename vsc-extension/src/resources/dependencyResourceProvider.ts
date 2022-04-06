import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyRequest, DependencyRequestResponse } from '../events'
import { Provider } from './provider'
import * as vscode from 'vscode'
import { ModManager } from '../mod/modManager'
import { globPattern } from '../projectWatcher'

@injectable()
export class DependencyResourceProvider implements Provider {
  constructor(private readonly modManager: ModManager) {}

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(DependencyRequest, this.onDependencyRequest.bind(this))
  }

  private async onDependencyRequest({ packageId, version }: DependencyRequest): Promise<DependencyRequestResponse> {
    console.log('received dependency request for packageId: ', packageId, ' version: ', version)

    const mod = this.modManager.getMod(packageId)
    if (!mod) {
      return { packageId, version, uris: [], error: new Error(`mod for ${packageId} does not exists`) }
    }

    const resources = (await mod.loadFolder.getProjectWorkspace(version)?.getResources(globPattern)) ?? []

    console.log(
      `found ${resources.length} dependency files in packageId: ${packageId}, resources: `,
      JSON.stringify(resources, null, 4)
    )

    const uris = resources.map((path) => vscode.Uri.file(path).toString())

    return { packageId, version, uris }
  }
}
