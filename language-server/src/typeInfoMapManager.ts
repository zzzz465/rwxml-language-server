import axios from 'axios'
import { AsEnumerable } from 'linq-es2015'
import { Metadata, RawTypeInfo, TypeInfoMap } from 'rwxml-analyzer'
import TypeInfoLoader from 'rwxml-analyzer/dist/rimworld-types/typeInfoLoader'

export type RimWorldVersion = typeof RimWorldVersionArray[number]

export const RimWorldVersionArray = ['1.0', '1.1', '1.2', '1.3', 'default'] as const

export class TypeInfoMapManager {
  private static readonly URL = 'https://www.github.com/zzzz465/rwxml-language-server/metadata'

  constructor(private readonly metadata: Metadata) {}

  async getTypeInfoMap(version: RimWorldVersion) {
    const urls = this.getTypeInfoDownloadURL(version)

    const responses = await Promise.all(
      urls.map(async (url) => ({
        url,
        response: await axios.get(url),
      }))
    )

    const rawTypeInfos: RawTypeInfo[] = []

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

    const typeInfoMap = TypeInfoLoader.load(rawTypeInfos)

    return typeInfoMap
  }

  private getTypeInfoDownloadURL(version: RimWorldVersion) {
    const urls = this.metadata.version[version].rawTypeInfos

    return AsEnumerable(Object.entries(urls))
      .Select(([k, v]) => v.url)
      .ToArray()
  }
}
