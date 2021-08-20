import axios from 'axios'
import path from 'path'
import { AsEnumerable } from 'linq-es2015'
import { Metadata, RawTypeInfo } from 'rwxml-analyzer'
import TypeInfoLoader from 'rwxml-analyzer/dist/rimworld-types/typeInfoLoader'

export type RimWorldVersion = typeof RimWorldVersionArray[number]

export const RimWorldVersionArray = ['1.0', '1.1', '1.2', '1.3', 'default'] as const

export class TypeInfoMapManager {
  private static readonly URL = 'https://www.github.com/zzzz465/rwxml-language-server/metadata'

  constructor(private readonly metadata: Metadata) {}

  async getTypeInfoMap(version: RimWorldVersion) {
    const rawTypeInfos: RawTypeInfo[] = []

    if (process.env.NODE_ENV === 'production') {
      const urls = this.getTypeInfoDownloadURL(version)

      const responses = await Promise.all(
        urls.map(async (url) => ({
          url,
          response: await axios.get(url),
        }))
      )

      for (const {
        url,
        response: { data, status },
      } of responses) {
        if (status === 200) {
          rawTypeInfos.push(...(data as RawTypeInfo[]))
        } else {
          console.error(`cannot get TypeInfo from url ${url}`)
        }
      }
    } else {
      const res = await this.getTypeInfoMapFromLocal(version)
      rawTypeInfos.push(...res)
    }

    const typeInfoMap = TypeInfoLoader.load(rawTypeInfos)

    return typeInfoMap
  }

  private async getTypeInfoMapFromLocal(version: RimWorldVersion): Promise<RawTypeInfo[]> {
    console.log(`loading typeInfoMap version: ${version} from local...`)
    const fs = await import('fs/promises')
    const baseURL = process.env.localTypeInfoBaseURL
    if (baseURL) {
      const corePath = path.join(baseURL, version, 'core.json')
      const coreRawTypeInfosText = await fs.readFile(corePath, { encoding: 'utf-8' })
      const coreRawTypeInfos = JSON.parse(coreRawTypeInfosText)

      console.log(`corePath: ${corePath}, loaded object type: ${typeof coreRawTypeInfos}`)

      return coreRawTypeInfos
    } else {
      throw new Error('env localTypeInfoBaseURL is not provided.')
    }
  }

  private getTypeInfoDownloadURL(version: RimWorldVersion) {
    const urls = this.metadata.version[version].rawTypeInfos

    return AsEnumerable(Object.entries(urls))
      .Select(([k, v]) => v.url)
      .ToArray()
  }
}
