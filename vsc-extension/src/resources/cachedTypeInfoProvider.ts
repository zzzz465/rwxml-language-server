import * as cp from 'child_process'
import * as crypto from 'crypto'
import dayjs from 'dayjs'
import { mkdirSync } from 'fs'
import * as fs from 'fs/promises'
import _ from 'lodash'
import * as os from 'os'
import * as path from 'path'
import * as semver from 'semver'
import { inject, injectable } from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import winston from 'winston'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { className, log, logFormat } from '../log'
import { md5sum } from '../utils/hash'
import jsonStr from '../utils/json'
import { PathStore } from './pathStore'
import { Provider } from './provider'
import { TypeInfoProvider } from './typeInfoProvider'

interface Cache {
  extractorVersion: string // semver
  createdBy: string
  createdAt: string // iso8601 format datetime

  requestedFileUris: string[]
  checksums: string[] // length is equal to rqeustedFileUris field

  data: any
}

@injectable()
export class CachedTypeInfoProvider implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(className(CachedTypeInfoProvider), logFormat),
    transports: [log],
  })

  // TODO: move this line to extractor.
  private static readonly extractorVersion = new semver.SemVer('0.9.0')

  get dllCacheDirectory(): string {
    return path.join(this.pathStore.cacheDirectory, 'dlls')
  }

  constructor(
    private readonly typeInfoProvider: TypeInfoProvider,
    @inject(PathStore.token) private readonly pathStore: PathStore
  ) {
    mkdirSync(this.dllCacheDirectory, { recursive: true })

    vscode.commands.registerCommand('rwxml:cache:clear', this.clearCache.bind(this))
    vscode.commands.registerCommand('rwxml:cache:openDir', this.openCacheDir.bind(this))
  }

  private openCacheDir(): void {
    const platform = os.platform()
    switch (platform) {
      case 'win32':
        cp.execSync(`start ${this.dllCacheDirectory}`, { shell: 'cmd.exe' })
        return

      case 'darwin':
        cp.execSync(`open ${this.dllCacheDirectory}`)
        return

      default:
        throw new Error(`platform ${platform} not supported. Please make an issue on github.`)
    }
  }

  private async clearCache(): Promise<void> {
    const caches = await fs.readdir(this.dllCacheDirectory)
    this.log.debug(`deleting ${caches.length} caches: ${jsonStr(caches)}`)
    await Promise.all(caches.map((c) => fs.rm(path.join(this.dllCacheDirectory, c))))

    vscode.window.showInformationMessage(`RWXML: Cleared ${caches.length} caches.`, 'OK')
  }

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  /**
   * @todo check cache confliction on write
   */
  private async onTypeInfoRequest({ uris, version }: TypeInfoRequest): Promise<TypeInfoRequestResponse> {
    this.log.debug(`received type info request. version: ${version}`)

    uris.sort()

    // get cache name based on checksum name of given uris
    // and make a short hash
    const cacheName = this.getCacheName(uris).slice(0, 12)
    const cachePath = path.join(this.pathStore.cacheDirectory, 'dlls', `${cacheName}.json`)

    this.log.debug(`received typeInfo request. uris count: ${uris.length}`)
    this.log.silly(`uris: ${jsonStr(uris.map((uri) => decodeURIComponent(uri.toString())))}`)

    const checkCacheValid = async (): Promise<{ valid: boolean; data: any }> => {
      // https://nodejs.org/api/fs.html#file-system-flags
      let file: fs.FileHandle | null = null

      try {
        file = await fs.open(cachePath, 'a+', '644')

        const cache = await this.getCache(file)
        return {
          valid: await this.isCacheValid(cache, uris),
          data: cache.data,
        }
      } catch (e) {
        this.log.warn(`failed opening cache. file: ${jsonStr(cachePath)}, err: `, e)
      } finally {
        await file?.close()
      }

      return {
        valid: false,
        data: null,
      }
    }

    const cacheData = await checkCacheValid()
    let data = cacheData.data
    if (!cacheData.valid) {
      this.log.debug('checksum invalid, updating cache.')

      const res = await this.typeInfoProvider.onTypeInfoRequest({ uris, version })
      if (res instanceof Error) {
        throw res
      }

      data = res.data

      await this.updateCache(cachePath, uris, data)
    } else {
      this.log.silly(`cache hit! uris: ${jsonStr(uris)}`)
    }

    return { data }
  }

  private getCacheName(files: string[]): string {
    const hash = crypto.createHash('md5')

    for (const file of files) {
      hash.update(file, 'utf-8')
    }

    return hash.digest('hex')
  }

  private async getCache(file: fs.FileHandle): Promise<Cache> {
    const data = (await file.readFile()).toString('utf-8')
    return JSON.parse(data) as Cache
  }

  private async isCacheValid(cache: Cache, files: string[]): Promise<boolean> {
    const cacheVersion = semver.parse(cache.extractorVersion, true)
    if (!cacheVersion) {
      return false
    }

    if (CachedTypeInfoProvider.extractorVersion.compare(cacheVersion) !== 0) {
      return false
    }

    const checksums = await this.getChecksums(files)

    return _.isEqual(cache.checksums, checksums)
  }

  private async getChecksums(files: string[]): Promise<string[]> {
    return [...files.map((uri) => vscode.Uri.parse(uri).fsPath).map(md5sum)]
  }

  private async updateCache(cachePath: string, files: string[], data: any): Promise<void> {
    try {
      const checksums = await this.getChecksums(files)

      const cache: Cache = {
        extractorVersion: CachedTypeInfoProvider.extractorVersion.format(),
        checksums,
        createdAt: dayjs().format(),
        createdBy: CachedTypeInfoProvider.name,
        data,
        requestedFileUris: files,
      }

      const raw = jsonStr(cache)

      await fs.writeFile(cachePath, raw, { encoding: 'utf-8', flag: 'w+', mode: '644' })
      this.log.debug(`write cache to file: ${jsonStr(cachePath)}`)
    } catch (err) {
      this.log.error(`failed to write cache to file: ${cachePath}, err: ${jsonStr(err)}`)
    }
  }
}
