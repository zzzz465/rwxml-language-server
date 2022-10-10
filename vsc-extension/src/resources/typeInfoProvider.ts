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

  private static readonly defaultVersion = new SemVer('0.0.0')

  constructor(@tsyringe.inject(mod.PathStore.token) private readonly pathStore: mod.PathStore) {}

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  private requestCounter = 0
  private clearProgress: (() => void) | null = null

  async onTypeInfoRequest({ uris, version }: TypeInfoRequest): Promise<TypeInfoRequestResponse | Error> {
    this.log.info('received TypeInfo request.')

    const CoreDLLPath = this.pathStore.RimWorldCoreDLLPath
    const semverVersion = this.parseVersion(version)
    if (!semverVersion) {
      return ono(`invalid version: ${version}`)
    }

    const isCoreDLLVersionCorrect = await this.checkCoreDLLVersion(CoreDLLPath, semverVersion)
    if (!isCoreDLLVersionCorrect) {
      return Error(
        `RWXML: Core DLL version mismatch. expected ${version}, got ${await this.getCoreDLLVersion(CoreDLLPath)}`
      )
    }

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
      log.error(typeInfo)
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

  async checkCoreDLLVersion(DLLPath: string, version: SemVer): Promise<boolean> {
    this.log.debug('checking Core DLL version...')
    if (version.compare(TypeInfoProvider.defaultVersion) === 0) {
      return true
    }

    const fileVersionOrErr = await this.getCoreDLLVersion(DLLPath)
    if (fileVersionOrErr instanceof Error) {
      this.log.debug(`failed to get Core DLL version. err: ${fileVersionOrErr}`)
      return false
    }

    const fileVersion = new SemVer(fileVersionOrErr)

    this.log.debug(`given version: ${version}, Core DLL version: ${fileVersion}`)

    return fileVersion.major === version.major && fileVersion.minor === version.minor
  }

  async getCoreDLLVersion(DLLPath: string): Promise<string | Error> {
    switch (process.platform) {
      case 'win32':
        return (await this.getFileVersionWindows(DLLPath)) ?? Error('RWXML: failed to get Core DLL version')

      case 'linux':
        return await this.getFileVersionLinux(DLLPath)

      default:
        return Error(`Unsupported platform: ${process.platform}`)
    }
  }

  private parseVersion(version: string): SemVer | null {
    if (version === 'default') {
      return TypeInfoProvider.defaultVersion
    } else {
      try {
        return new SemVer(version, true)
      } catch (err) {
        return null
      }
    }
  }

  private async getFileVersionWindows(path: string): Promise<string | null> {
    const properties = await getFileProperties(path)
    return properties.Version ?? null
  }

  private async getFileVersionLinux(path: string): Promise<string | Error> {
    try {
      const process = spawnSync('strings', [path, '-el'], { stdio: 'pipe' })
      const stdout = process.stdout.toString('utf-8')
      const lines = stdout.split('\n')

      const index = lines.findIndex((value) => value === 'Assembly Version')
      return lines[index + 1]
    } catch (err: unknown) {
      return ono(err as any)
    }
  }
}
