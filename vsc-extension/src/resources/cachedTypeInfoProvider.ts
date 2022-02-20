import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TypeInfoProvider } from './typeInfoProvider'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { Provider } from './provider'
import { PathStore } from './pathStore'
import * as crypto from 'crypto'
import * as vscode from 'vscode'
import * as fs from 'fs/promises'
import * as path from 'path'
import { md5sum } from '../utils/hash'
import _ from 'lodash'
import dayjs from 'dayjs'

interface Cache {
  createdBy: string
  createdAt: string // iso8601 format datetime

  requestedFileUris: string[]
  checksums: string[] // length is equal to rqeustedFileUris field

  data: any
}

@injectable()
export class CachedTypeInfoProvider implements Provider {
  constructor(private readonly typeInfoProvider: TypeInfoProvider, private readonly pathStore: PathStore) {}

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  /**
   * @todo check cache confliction on write
   */
  private async onTypeInfoRequest({ uris }: TypeInfoRequest): Promise<TypeInfoRequestResponse> {
    // get cache name based on checksum name of given uris
    // and make a short hash
    const cacheName = this.getCacheName(uris).slice(0, 12)
    const cachePath = path.join(this.pathStore.cacheDirectory, 'dlls', cacheName)

    const checkCacheValid = async () => {
      // https://nodejs.org/api/fs.html#file-system-flags
      let file: fs.FileHandle | null = null

      try {
        file = await fs.open(cachePath, '644', 'a+')

        const cache = await this.getCache(file)
        return {
          valid: this.isCacheValid(cache, uris),
          data: cache.data,
        }
      } catch (e) {
        console.error(e)
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
      const res = await this.typeInfoProvider.onTypeInfoRequest({ uris })
      if (res.error) {
        return res
      }

      data = res.data

      await this.updateCache(cachePath, uris, data)
    }

    return data
  }

  private getCacheName(files: string[]): string {
    const hash = crypto.createHash('md5')

    for (const file of files) {
      hash.update(file)
    }

    return hash.digest().toString('utf-8')
  }

  private async getCache(file: fs.FileHandle): Promise<Cache> {
    const data = (await file.readFile()).toString('utf-8')
    return JSON.parse(data) as Cache
  }

  private async isCacheValid(cache: Cache, files: string[]): Promise<boolean> {
    const checksums = await this.getChecksums(files)

    return _.isEqual(cache.checksums, checksums)
  }

  private async getChecksums(files: string[]): Promise<string[]> {
    return [
      ...files
        .sort()
        .map(md5sum)
        .map((buff) => buff.toString('utf-8')),
    ]
  }

  private async updateCache(cachePath: string, files: string[], data: any) {
    const checksums = await this.getChecksums(files)

    const cache: Cache = {
      checksums,
      createdAt: dayjs().format(),
      createdBy: CachedTypeInfoProvider.name,
      data,
      requestedFileUris: files,
    }

    const raw = JSON.stringify(cache, null, 4)

    await fs.writeFile(cachePath, raw, { encoding: 'utf-8', mode: 'w+' })
  }
}
