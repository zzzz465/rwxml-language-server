/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TypeInfoMap, TypeInfoLoader, TypeInfo } from '@rwxml/analyzer'
import { delay, inject, Lifecycle, scoped } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { ConnectionToken } from './connection'
import { TypeInfoRequest } from './events'
import { Project } from './project'
import * as winston from 'winston'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'
import { v4 as uuid } from 'uuid'
import { LogToken } from './log'

@scoped(Lifecycle.ContainerScoped)
export class TypeInfoMapProvider {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${TypeInfoMapProvider.name}] [${this.version}] ${info.message}`
  )
  private readonly log: winston.Logger

  constructor(
    @inject(RimWorldVersionToken) private readonly version: RimWorldVersion,
    @inject(ConnectionToken) private readonly connection: Connection,
    @inject(delay(() => Project)) private readonly project: Project,
    @inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = baseLogger.child({ format: this.logFormat })
  }

  async get(requestId: string = uuid()): Promise<[TypeInfoMap, Error?]> {
    try {
      const dllUris = this.getTargetDLLUris()

      this.log.debug(`[${requestId}] requesting typeInfo, uris: ${JSON.stringify(dllUris, null, 2)}`)
      const typeInfos = await this.requestTypeInfos(dllUris)
      this.log.debug(`[${requestId}] received typeInfo from client, length: ${typeInfos.length}`)

      const typeInfoMap = TypeInfoLoader.load(typeInfos)

      return [typeInfoMap, undefined]
    } catch (e) {
      return [new TypeInfoMap(), e as Error]
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
      throw error
    }

    // NOTE: should I type check this result?
    return data as Partial<TypeInfo>[]
  }
}
