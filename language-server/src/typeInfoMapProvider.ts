/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TypeInfoMap, TypeInfoLoader, TypeInfo } from '@rwxml/analyzer'
import { Lifecycle, scoped } from 'tsyringe'

@scoped(Lifecycle.ContainerScoped)
export class TypeInfoMapProvider {
  async get(): Promise<TypeInfoMap> {
    const dllUris = this.getTargetDLLUris()

    const typeInfos = await this.requestTypeInfos(dllUris)

    const typeInfoMap = TypeInfoLoader.load(typeInfos)

    return typeInfoMap
  }

  private getTargetDLLUris(): string[] {
    throw new Error('not implemented')
  }

  private async requestTypeInfos(dllUris: string[]): Promise<Partial<TypeInfo>[]> {
    throw new Error('not implemented')
  }

  /**
   * @deprecated
   * @param version
   * @returns
   */
  // getTypeInfoMap(version: RimWorldVersion): TypeInfoMap {
  //   const data = rawTypeInfoMap[version] ?? fallbackTypeInfos
  //   if (data) {
  //     const rawTypeInfos = Object.values(data).flat(1)
  //     const typeInfoMap = TypeInfoLoader.load(rawTypeInfos)

  //     return typeInfoMap
  //   } else {
  //     throw new Error(`version ${version} is not supported. cannot find any TypeInfo...`)
  //   }
  // }

  // updateTypeInfo(version: RimWorldVersion, typeInfos: unknown[]) {
  //   rawTypeInfoMap[version] = typeInfos
  // }
}
