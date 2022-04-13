import { Connection } from 'vscode-languageserver'
import { Logger } from 'winston'
import { ParsedTypeInfoRequest, ParsedTypeInfoRequestResponse } from '../../events'
import { ProjectManager } from '../../projectManager'
import { Provider } from '../provider'
import * as winston from 'winston'
import * as tsyringe from 'tsyringe'
import { ProjectHelper } from '../utils/project'

@tsyringe.injectable()
export class ParsedTypeInfoRequestHandler implements Provider {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${ParsedTypeInfoRequestHandler.name}] ${info.message}`
  )
  private readonly log: winston.Logger

  constructor(private readonly projectManager: ProjectManager, private readonly projectHelper: ProjectHelper) {
    this.log = winston.createLogger({
      transports: [new winston.transports.Console()],
      format: this.logFormat,
    })
  }

  init(connection: Connection): void {
    connection.onRequest(ParsedTypeInfoRequest, this.projectHelper.wrapExceptionStackTraces(this.onRequest.bind(this)))
  }

  protected getLogger(): Logger {
    return this.log
  }

  private async onRequest({
    version,
  }: ParsedTypeInfoRequest): Promise<ParsedTypeInfoRequestResponse | null | undefined> {
    const project = this.projectManager.getProject(version)

    try {
      const [typeInfoMap, error] = await project.getTypeInfo()
      if (error) {
        return { version, data: '', error: error }
      }

      return { version, data: typeInfoMap.rawData }
    } catch (err) {
      return { version, data: null, error: err as Error }
    }
  }
}
