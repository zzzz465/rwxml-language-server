/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TypeInfo, TypeInfoLoader, TypeInfoMap } from '@rwxml/analyzer'
import { delay, inject, Lifecycle, scoped } from 'tsyringe'
import { v4 as uuid } from 'uuid'
import { Connection } from 'vscode-languageserver'
import * as winston from 'winston'
import { ConnectionToken } from './connection'
import { TypeInfoRequest } from './events'
import defaultLogger, { className, logFormat } from './log'
import { Project } from './project'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'
import jsonStr from './utils/json'

@scoped(Lifecycle.ContainerScoped)
export class TypeInfoMapProvider {
  private log = winston.createLogger({
    format: winston.format.combine(className(TypeInfoMapProvider), logFormat),
    transports: [defaultLogger()],
  })

  constructor(
    @inject(RimWorldVersionToken) private readonly version: RimWorldVersion,
    @inject(ConnectionToken) private readonly connection: Connection,
    @inject(delay(() => Project)) private readonly project: Project
  ) {}

  async get(requestId: string = uuid()): Promise<[TypeInfoMap, Error?]> {
    try {
      const dllUris = this.getTargetDLLUris()

      this.log.debug(`requesting typeInfo. count: ${dllUris.length}`, { id: requestId })
      this.log.silly(`uris: ${jsonStr(dllUris)}`)
      const typeInfos = await this.requestTypeInfos(dllUris)
      this.log.debug(`received typeInfo from client, length: ${typeInfos.length}`, { id: requestId })

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
