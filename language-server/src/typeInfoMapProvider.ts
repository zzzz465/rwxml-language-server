/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TypeInfo, TypeInfoLoader, TypeInfoMap } from '@rwxml/analyzer'
import ono from 'ono'
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

  async get(requestId: string = uuid()): Promise<[TypeInfoMap, Error | null]> {
    const dllUris = this.getTargetDLLUris()

    this.log.debug(`requesting typeInfo. count: ${dllUris.length}`, { id: requestId })
    this.log.silly(`uris: ${jsonStr(dllUris)}`)
    const typeInfos = await this.requestTypeInfos(dllUris)
    if (typeInfos instanceof Error) {
      return [new TypeInfoMap(), typeInfos]
    }

    this.log.debug(`received typeInfo from client, length: ${typeInfos.length}`, { id: requestId })

    const typeInfoMap = TypeInfoLoader.load(typeInfos)

    return [typeInfoMap, null]
  }

  private getTargetDLLUris(): string[] {
    return [...this.project.resourceStore.dllFiles.values()]
  }

  private async requestTypeInfos(uris: string[]): Promise<Partial<TypeInfo>[] | Error> {
    try {
      return (await this.connection.sendRequest(TypeInfoRequest, { uris })).data as Partial<TypeInfo>[]
    } catch (err) {
      // TODO: error handling
      return ono(err as any, 'failed to request typeInfo')
    }
  }
}
