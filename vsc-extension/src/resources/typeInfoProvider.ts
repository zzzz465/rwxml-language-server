import * as tsyringe from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import winston from 'winston'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { className, log, logFormat } from '../log'
import * as mod from '../mod'
import { extractTypeInfos } from '../typeInfo'
import jsonStr from '../utils/json'
import { createProgress } from '../utils/progress'
import { Provider } from './provider'

@tsyringe.injectable()
export class TypeInfoProvider implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(className(TypeInfoProvider), logFormat),
    transports: [log],
  })

  constructor(@tsyringe.inject(mod.PathStore.token) private readonly pathStore: mod.PathStore) {}

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  private requestCounter = 0
  private clearProgress: (() => void) | null = null

  async onTypeInfoRequest({ uris }: TypeInfoRequest): Promise<TypeInfoRequestResponse | Error> {
    if (!this.clearProgress) {
      const { resolve } = await createProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'RWXML: reading DLLs...',
      })
      this.clearProgress = resolve
    }
    this.requestCounter += 1

    const typeInfo = await this.extractTypeInfo(uris)

    this.requestCounter -= 1
    if (this.requestCounter < 0) {
      throw Error()
    }

    if (this.requestCounter === 0) {
      console.assert(this.clearProgress !== null)
      this.clearProgress()
      this.clearProgress = null
    }

    if (typeInfo instanceof Error) {
      return typeInfo
    } else {
      return { data: typeInfo }
    }
  }

  async extractTypeInfo(uris: string[]): Promise<unknown[] | Error> {
    const dllPaths = uris.map((uri) => vscode.Uri.parse(uri).fsPath) // single .dll file or directory

    const managedDirectory = this.pathStore.RimWorldManagedDirectory
    this.log.debug('managed directory: ', managedDirectory)
    dllPaths.push(managedDirectory)

    this.log.debug(`extracting typeinfos from: ${jsonStr(dllPaths)}`)
    return await extractTypeInfos(...dllPaths)
  }
}
