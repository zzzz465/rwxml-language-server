/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TypeInfoMap, TypeInfoLoader, TypeInfo } from '@rwxml/analyzer'
import { container, Lifecycle, scoped } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { TypeInfoRequest } from './events'
import { Project } from './project'

@scoped(Lifecycle.ContainerScoped)
export class TypeInfoMapProvider {
  constructor(private readonly connection: Connection) {}

  async get(): Promise<TypeInfoMap> {
    const dllUris = this.getTargetDLLUris()

    const typeInfos = await this.requestTypeInfos(dllUris)

    const typeInfoMap = TypeInfoLoader.load(typeInfos)

    return typeInfoMap
  }

  private getTargetDLLUris(): string[] {
    const project = container.resolve(Project)

    return [...project.resourceStore.dllFiles.values()]
  }

  private async requestTypeInfos(uris: string[]): Promise<Partial<TypeInfo>[]> {
    const { data, error } = await this.connection.sendRequest(TypeInfoRequest, {
      uris,
    })

    if (error) {
      throw new Error(error)
    }

    // NOTE: should I type check this result?
    return data as Partial<TypeInfo>[]
  }
}
