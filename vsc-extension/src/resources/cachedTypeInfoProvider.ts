import { inject, injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TypeInfoProvider } from './typeInfoProvider'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { Provider } from './provider'
import { PathStore } from './pathStore'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import { mkdirSync } from 'fs'
import * as path from 'path'
import { md5sum } from '../utils/hash'
import _ from 'lodash'
import dayjs from 'dayjs'
import { v4 as uuid } from 'uuid'
import * as vscode from 'vscode'
import * as os from 'os'
import * as cp from 'child_process'
import * as semver from 'semver'

interface Cache {
  extractorVersion: string // semver
  createdBy: string
  createdAt: string // iso8601 format datetime

  requestedFileUris: string[]
  checksums: string[] // length is equal to rqeustedFileUris field

  compression: string
  data: any
}

@injectable()
export class CachedTypeInfoProvider implements Provider {
  private static readonly extractorVersion = new semver.SemVer('0.6.0')

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

  private openCacheDir() {
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

  private async clearCache() {
    const caches = await fs.readdir(this.dllCacheDirectory)
    console.log(`deleting ${caches.length} caches: ${JSON.stringify(caches, null, 4)}`)
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
  private async onTypeInfoRequest({ uris }: TypeInfoRequest): Promise<TypeInfoRequestResponse> {
    const requestId = uuid()

    uris.sort()

    // get cache name based on checksum name of given uris
    // and make a short hash
    const cacheName = this.getCacheName(uris).slice(0, 12)
    const cachePath = path.join(this.pathStore.cacheDirectory, 'dlls', `${cacheName}.json`)

    console.log(`[${requestId}] requested uris: ${JSON.stringify(uris, null, 4)}`)
    console.log(`[${requestId}] cache path: ${uris}`)

    const [cache, err0] = await this.getCacheFromFile(cachePath)
    if (err0) {
      console.warn(err0)
    }

    let typeInfoData = cache?.data

    if (!(await this.isCacheValid(cache, uris))) {
      console.log(`[${requestId}] checksum invalid, updating cache.`)

      const res = await this.typeInfoProvider.onTypeInfoRequest({ uris })
      if (res.error) {
        return res
      } else if (!res.data) {
        return { error: `[${requestId}] while extracting typeInfos, error is null but data is undefined.` }
      }

      typeInfoData = res.data
      await this.updateCache(cachePath, uris, res.data, requestId)
    }

    return { data: typeInfoData }
  }

  private getCacheName(files: string[]): string {
    const hash = crypto.createHash('md5')

    for (const file of files) {
      hash.update(file, 'utf-8')
    }

    return hash.digest('hex')
  }

  private async isCacheValid(cache: Cache | undefined, files: string[]): Promise<boolean> {
    if (!cache) {
      return false
    }

    const cacheVersion = semver.parse(cache.extractorVersion, true)
    if (!cacheVersion) {
      return false
    }

    if (CachedTypeInfoProvider.extractorVersion.compare(cacheVersion) !== 0) {
      return false
    }

    if (cache.compression !== this.compressionType) {
      return false
    }

    const checksums = await this.getChecksums(files)

    return _.isEqual(cache.checksums, checksums)
  }

  private async getChecksums(files: string[]): Promise<string[]> {
    return [...files.map((uri) => vscode.Uri.parse(uri).fsPath).map(md5sum)]
  }

  private async updateCache(cachePath: string, files: string[], data: any, requestId: string) {
    try {
      const checksums = await this.getChecksums(files)

      const cache: Cache = {
        extractorVersion: CachedTypeInfoProvider.extractorVersion.format(),
        checksums,
        createdAt: dayjs().format(),
        createdBy: CachedTypeInfoProvider.name,
        compression: this.compressionType,
        data,
        requestedFileUris: files,
      }

      await this.saveCache(cachePath, cache)

      console.log(`[${requestId}] write cache to file: `, cachePath)
    } catch (err) {
      console.error(`[${requestId}] failed to write cache to file: ${cachePath}, err: `, err)
    }
  }

  private async getCacheFromFile(cachePath: string): Promise<[Cache?, Error?]> {
    let file: fs.FileHandle | null = null

    try {
      file = await fs.open(cachePath, 'a+', '644')
      const data = await file.readFile()
      const raw = data.toString('utf-8')

      const cache = JSON.parse(raw) as Cache
      cache.data = this.deserializeData(cache.data)

      return [cache, undefined]
    } catch (e) {
      return [undefined, new Error(String(e))]
    } finally {
      await file?.close()
    }
  }

  private async saveCache(cachePath: string, cache: Cache): Promise<void> {
    cache.data = this.serializeData(cache.data)

    const raw = JSON.stringify(cache, null, 4)

    await fs.writeFile(cachePath, raw, { encoding: 'utf-8', flag: 'w+', mode: '644' })
  }

  /**
   * serializeData is used to make value of the field "data" in cache.
   * @virtual called when updating cache.
   */
  protected serializeData(data: any): any {
    return data
  }

  /**
   * deserializeData is used to make value of the field "data" in cache.
   * @virtual called when loading cache.
   */
  protected deserializeData(data: any): any {
    return data
  }

  /**
   * type of the value compression. must be changed if serialize/deserialize is updated.
   */
  protected get compressionType(): string {
    return 'None'
  }
}
