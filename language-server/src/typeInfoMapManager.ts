/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from 'path'
import { AsEnumerable } from 'linq-es2015'
import { Metadata, RawTypeInfo, TypeInfoMap, TypeInfoLoader } from '@rwxml/analyzer'

//@ts-ignore
import raw_default_core from '../../metadata/rawTypeInfos/default/core.json'
//@ts-ignore
import raw_1_3_core from '../../metadata/rawTypeInfos/1.3/core.json'

// TODO: add data for other versions
const rawTypeInfoMap: Record<string, Record<string, any>> = {
  default: {
    core: raw_default_core,
  },
  '1.3': {
    core: raw_1_3_core,
  },
  '1.2': {
    core: raw_1_3_core,
  },
  '1.1': {
    core: raw_1_3_core,
  },
  '1.0': {
    core: raw_1_3_core,
  },
}

export type RimWorldVersion = typeof RimWorldVersionArray[number]

export const RimWorldVersionArray = ['1.0', '1.1', '1.2', '1.3', 'default'] as const

export class TypeInfoMapManager {
  async getTypeInfoMap(version: RimWorldVersion): Promise<TypeInfoMap> {
    const data = rawTypeInfoMap[version]
    if (data) {
      const rawTypeInfos = Object.values(data).flat(1)
      const typeInfoMap = TypeInfoLoader.load(rawTypeInfos)

      return typeInfoMap
    } else {
      throw new Error(`version ${version} is not supported. cannot find any TypeInfo...`)
    }
  }
}
