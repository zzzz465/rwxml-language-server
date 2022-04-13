import * as tsyringe from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Provider } from '../provider'
import winston from 'winston'
import { ProjectHelper } from '../utils/project'
import { ProjectManager } from '../../projectManager'
import { DefListRequest, DefListRequestResponse } from '../../events'
import { Def } from '@rwxml/analyzer'
import { PlainObject } from '../../types/plainObject'
import { AsEnumerable } from 'linq-es2015'

@tsyringe.injectable()
export class DefListRequestHandler implements Provider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${DefListRequestHandler.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(private readonly projectManager: ProjectManager, private readonly projectHelper: ProjectHelper) {
    this.log = winston.createLogger({
      transports: [new winston.transports.Console()],
      format: this.logFormat,
    })
  }

  init(connection: Connection): void {
    connection.onRequest(DefListRequest, this.projectHelper.wrapExceptionStackTraces(this.onRequest.bind(this)))
  }

  protected getLogger(): winston.Logger {
    return this.log
  }

  private async onRequest({ version }: DefListRequest): Promise<DefListRequestResponse | null | undefined> {
    const project = this.projectManager.getProject(version)

    const marshalledDefs = AsEnumerable(project.defManager.defDatabase.defs())
      .Select((def) => this.marshalDef(def))
      .ToArray()

    return {
      version,
      data: {
        defs: marshalledDefs,
      },
    }
  }

  private marshalDef(def: Def): PlainObject {
    return {
      type: def.getDefType(),
      defName: def.getDefName() ?? '',
    }
  }
}
