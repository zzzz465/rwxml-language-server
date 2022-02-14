import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyRequest, DependencyRequestResponse } from '../events'
import { Provider } from './provider'
import * as vscode from 'vscode'
import { ModManager } from '../mod/modManager'
import glob from 'fast-glob'
import { globPattern } from '../projectWatcher'

@injectable()
export class DependencyResourceProvider implements Provider {
  constructor(private readonly modManager: ModManager) {}

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(DependencyRequest, this.onDependencyRequest.bind(this))
  }

  private async onDependencyRequest({ packageId }: DependencyRequest): Promise<DependencyRequestResponse> {
    console.log('received dependency request for packageId: ', packageId)

    const mod = this.modManager.getMod(packageId)
    if (!mod) {
      return { packageId, uris: [], error: `mod for ${packageId} does not exists` }
    }

    // use fast-glob because vscode doesn't support findFiles for outside of workspace
    const root = mod.rootDirectory.fsPath
    const paths = await glob(globPattern, {
      caseSensitiveMatch: false,
      cwd: root,
      absolute: true,
      ignore: ['**/about.xml', '**/loadfolder.xml'],
      onlyFiles: true,
    })

    console.log(`found ${paths.length} dependency files in packageId: ${packageId}, files: `, paths)

    const uris = paths.map((path) => vscode.Uri.file(path).toString())

    return { packageId, uris }
  }
}
