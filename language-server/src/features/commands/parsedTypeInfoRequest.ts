import * as tsyringe from 'tsyringe'
import { Connection, ResponseError } from 'vscode-languageserver'
import * as winston from 'winston'
import { Logger } from 'winston'
import { ParsedTypeInfoRequest, ParsedTypeInfoRequestResponse } from '../../events'
import { className, logFormat } from '../../log'
import { ProjectManager } from '../../projectManager'
import { Provider } from '../provider'
import { ProjectHelper } from '../utils/project'

@tsyringe.injectable()
export class ParsedTypeInfoRequestHandler implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(className(ParsedTypeInfoRequestHandler), logFormat),
    transports: [new winston.transports.Console()],
  })

  constructor(private readonly projectManager: ProjectManager, private readonly projectHelper: ProjectHelper) {}

  init(connection: Connection): void {
    connection.onRequest(ParsedTypeInfoRequest, this.projectHelper.wrapExceptionStackTraces(this.onRequest.bind(this)))
  }

  protected getLogger(): Logger {
    return this.log
  }

  private async onRequest({
    version,
  }: ParsedTypeInfoRequest): Promise<ParsedTypeInfoRequestResponse | ResponseError<Error>> {
    const project = this.projectManager.getProject(version)

    const [typeInfoMap, error] = await project.getTypeInfo()
    if (error) {
      return new ResponseError(1, 'failed to get typeInfo', error)
    }

    return { version, data: typeInfoMap }
  }
}
