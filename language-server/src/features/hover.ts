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

/**
 * HoverProvider provide feature for onHover() request
 * @example
 * // onHover DefReference example
 * <NeedDef>
 *  <defName>DrugDesire</defName>
 *  <needClass>Need_Chemical_Any</needClass>
 *  <label>chemical</label>
 *  ...
 * </NeedDef>
 *
 * packageId: `Ludeon.RimWorld`
 * source: `C:/Program files (x86)/Steam/steamapps/common/RimWorld/Data/Core/Defs/NeedDefs/Needs.xml`
 * @example
 * // onHover def Node Tag example (shows def hierarchy tree)
 * definition NeedDef extends
 * - NeedDefBase
 * - ThingDef
 *
 * packageId: `Ludeon.RimWorld`
 * source: `C:/Program files (x86)/Steam/steamapps/common/RimWorld/Data/Core/Defs/NeedDefs/Needs.xml`
 * @example
 * // onHover property example
 * property "defName" type "string" inherited from <ThingDef>
 *
 * packageId: `Ludeon.RimWorld`
 * source: `C:/Program files (x86)/Steam/steamapps/common/RimWorld/Data/Core/Defs/NeedDefs/Needs.xml`
 * @example
 * // onHover content (string)
 * don't display anything
 */
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
