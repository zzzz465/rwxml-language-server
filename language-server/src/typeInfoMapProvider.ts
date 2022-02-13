/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TypeInfoMap, TypeInfoLoader, TypeInfo } from '@rwxml/analyzer'
import { delay, inject, Lifecycle, scoped } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { ConnectionToken } from './connection'
import { TypeInfoRequest } from './events'
import { Project } from './project'

@scoped(Lifecycle.ContainerScoped)
export class TypeInfoMapProvider {
  constructor(
    @inject(ConnectionToken) private readonly connection: Connection,
    @inject(delay(() => Project)) private readonly project: Project
  ) {}

  async get(): Promise<TypeInfoMap> {
    const dllUris = this.getTargetDLLUris()

    const typeInfos = await this.requestTypeInfos(dllUris)

    const typeInfoMap = TypeInfoLoader.load(typeInfos)

    return typeInfoMap
  }

  private getTargetDLLUris(): string[] {
    return [...this.project.resourceStore.dllFiles.values()]
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
