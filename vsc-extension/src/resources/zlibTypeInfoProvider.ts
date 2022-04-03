import * as tsyringe from 'tsyringe'
import { CachedTypeInfoProvider } from './cachedTypeInfoProvider'
import * as zlib from 'zlib'

/**
 * ZLibTypeInfoProvider provides CachedTypeInfoProvider with zlib compression.
 */
@tsyringe.injectable()
export class ZLibTypeInfoProvider extends CachedTypeInfoProvider {
  protected get compressionType(): string {
    return 'zlib'
  }

  protected deserializeData(data: any): any {
    const decompressed = zlib.gunzipSync(data)
    const jsonText = decompressed.toString('base64')

    return JSON.parse(jsonText)
  }

  protected serializeData(data: any): any {
    const jsonText = JSON.stringify(data)
    const compressed = zlib.gzipSync(jsonText)
    return compressed.toString('base64')
  }

  protected get cacheCreator(): string {
    return ZLibTypeInfoProvider.name
  }
}
