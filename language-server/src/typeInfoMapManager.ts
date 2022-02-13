/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TypeInfoMap, TypeInfoLoader } from '@rwxml/analyzer'

//@ts-ignore
import fallbackTypeInfos from '../../metadata/rawTypeInfos/1.3/core.json'
import { singleton } from 'tsyringe'
import { RimWorldVersion } from './RimWorldVersion'

// TODO: add data for other versions
const rawTypeInfoMap: Record<string, Record<string, any> | undefined> = {}

@singleton()
export class TypeInfoMapManager {
  getTypeInfoMap(version: RimWorldVersion): TypeInfoMap {
    const data = rawTypeInfoMap[version] ?? fallbackTypeInfos
    if (data) {
      const rawTypeInfos = Object.values(data).flat(1)
      const typeInfoMap = TypeInfoLoader.load(rawTypeInfos)

      return typeInfoMap
    } else {
      throw new Error(`version ${version} is not supported. cannot find any TypeInfo...`)
    }
  }

  updateTypeInfo(version: RimWorldVersion, typeInfos: unknown[]) {
    rawTypeInfoMap[version] = typeInfos
  }
}
