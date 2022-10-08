import { serializeError } from 'serialize-error'
import { injectable } from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import winston from 'winston'
import { DependencyRequest, DependencyRequestResponse } from '../events'
import { className, log, logFormat } from '../log'
import { ModManager } from '../mod/modManager'
import { globPattern } from '../projectWatcher'
import jsonStr from '../utils/json'
import { Provider } from './provider'

@injectable()
export class DependencyResourceProvider implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(className(DependencyResourceProvider), logFormat),
    transports: [log],
  })

  constructor(private readonly modManager: ModManager) {}

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(DependencyRequest, this.onDependencyRequest.bind(this))
  }

  private async onDependencyRequest({ packageId, version }: DependencyRequest): Promise<DependencyRequestResponse> {
    this.log.debug(`received dependency request for packageId: ${packageId}, version: ${version}`)

    // if pacakgeId "" is UB.
    const mod = this.modManager.getMod(packageId)
    if (!packageId || !mod) {
      return {
        packageId,
        version,
        uris: [],
        error: serializeError(new Error(`mod for ${packageId} does not exists`)) as Error,
      }
    }

    const resources = (await mod.loadFolder.getProjectWorkspace(version)?.getResources(globPattern)) ?? []

    this.log.debug(`found ${resources.length} dependency files in packageId: ${packageId}`)
    this.log.silly(`items: ${jsonStr(resources)}`)

    const uris = resources.map((path) => vscode.Uri.file(path).toString())

    return { packageId, version, uris }
  }
}
