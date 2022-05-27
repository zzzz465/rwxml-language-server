import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyRequest, DependencyRequestResponse } from '../events'
import { Provider } from './provider'
import * as vscode from 'vscode'
import { ModManager } from '../mod/modManager'
import { globPattern } from '../projectWatcher'
import { serializeError } from 'serialize-error'
import winston from 'winston'
import defaultLogger, { className, logFormat } from '../log'
import jsonStr from '../utils/json'

@injectable()
export class DependencyResourceProvider implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(className(DependencyResourceProvider), logFormat),
    transports: [defaultLogger()],
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
