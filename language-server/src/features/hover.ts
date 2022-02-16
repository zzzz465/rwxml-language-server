import { injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Provider } from './provider'
import * as winston from 'winston'
import * as ls from 'vscode-languageserver'
import { RangeConverter } from '../utils/rangeConverter'
import { URI } from 'vscode-uri'
import { LoadFolder } from '../mod/loadfolders'
import { ProjectManager } from '../projectManager'
import { Project } from '../project'

@injectable()
export class HoverProvider extends Provider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${HoverProvider.name}] ${info.message}`)
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  constructor(loadFolder: LoadFolder, projectManager: ProjectManager, private readonly rangeConverter: RangeConverter) {
    super(loadFolder, projectManager)
  }

  protected getLogger(): winston.Logger {
    return this.log
  }

  listen(connection: Connection): void {
    connection.onHover(this.wrapExceptionStackTraces(this.onHoverRequest.bind(this)))
  }

  private async onHoverRequest(p: ls.HoverParams): Promise<ls.Hover | null | undefined> {
    const uri = URI.parse(p.textDocument.uri)
    const projects = this.getProjects(uri)
    return this.onHover(projects, uri, p.position)
  }

  private onHover(projects: Project[], uri: URI, position: ls.Position): ls.Hover | null | undefined {
    throw new Error('method not implemented')
  }
}
