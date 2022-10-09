import { injectable } from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient, ResponseError } from 'vscode-languageclient'
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

  private async onDependencyRequest({
    packageId,
    version,
  }: DependencyRequest): Promise<DependencyRequestResponse | ResponseError<Error>> {
    this.log.debug(`received dependency request for packageId: ${packageId}, version: ${version}`)
    if (!packageId) {
      return new ResponseError(1, 'packageId is required')
    }

    const mod = this.modManager.getMod(packageId)
    if (!mod) {
      return new ResponseError(2, `mod not found: ${packageId}`)
    }

    const resources = (await mod.loadFolder.getProjectWorkspace(version)?.getResources(globPattern)) ?? []

    this.log.debug(`found ${resources.length} dependency files in packageId: ${packageId}`)
    this.log.silly(`items: ${jsonStr(resources)}`)

    const uris = resources.map((path) => vscode.Uri.file(path).toString())

    return { packageId, version, uris }
  }
}
