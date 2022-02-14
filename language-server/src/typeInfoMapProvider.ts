/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TypeInfoMap, TypeInfoLoader, TypeInfo } from '@rwxml/analyzer'
import { delay, inject, Lifecycle, scoped } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { ConnectionToken } from './connection'
import { TypeInfoRequest } from './events'
import { Project } from './project'
import * as winston from 'winston'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'

@scoped(Lifecycle.ContainerScoped)
export class TypeInfoMapProvider {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${TypeInfoMapProvider.name}] [${this.version}] ${info.message}`
  )
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  constructor(
    @inject(RimWorldVersionToken) private readonly version: RimWorldVersion,
    @inject(ConnectionToken) private readonly connection: Connection,
    @inject(delay(() => Project)) private readonly project: Project
  ) {}

  async get(): Promise<TypeInfoMap> {
    const dllUris = this.getTargetDLLUris()

    try {
      this.log.debug(`requesting typeInfo, uris: ${String(dllUris)}`)
      const typeInfos = await this.requestTypeInfos(dllUris)
      this.log.debug(`received typeInfo from client, length: ${typeInfos.length}`)

      const typeInfoMap = TypeInfoLoader.load(typeInfos)

      return typeInfoMap
    } catch (err) {
      this.log.error(err)

      return new TypeInfoMap()
    }
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
