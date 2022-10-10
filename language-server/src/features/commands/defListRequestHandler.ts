import { Def } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import winston from 'winston'
import { DefListRequest, DefListRequestResponse } from '../../events'
import defaultLogger, { withClass } from '../../log'
import { ProjectManager } from '../../projectManager'
import { PlainObject } from '../../types/plainObject'
import { Provider } from '../provider'
import { ProjectHelper } from '../utils/project'

@tsyringe.injectable()
export class DefListRequestHandler implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(DefListRequestHandler)),
    transports: [defaultLogger()],
  })

  constructor(private readonly projectManager: ProjectManager, private readonly projectHelper: ProjectHelper) {}

  init(connection: Connection): void {
    connection.onRequest(DefListRequest, this.projectHelper.wrapExceptionStackTraces(this.onRequest.bind(this)))
  }

  protected getLogger(): winston.Logger {
    return this.log
  }

  private async onRequest({ version }: DefListRequest): Promise<DefListRequestResponse | null> {
    const project = this.projectManager.getProject(version)
    if (!project) {
      return null
    }

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
