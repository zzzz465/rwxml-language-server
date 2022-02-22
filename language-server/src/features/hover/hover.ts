import { inject, injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Provider } from '../provider'
import * as winston from 'winston'
import * as ls from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { LoadFolder } from '../../mod/loadfolders'
import { ProjectManager } from '../../projectManager'
import { Project } from '../../project'
import { LogToken } from '../../log'
import { DefReferenceHover } from './defReference'
import { Injectable, Node, Text } from '@rwxml/analyzer'
import { RangeConverter } from '../../utils/rangeConverter'
import {
  isPointingDefReferenceContent,
  isPointingInjectableTag,
  isPointingParentNameAttributeValue,
} from '../utils/node'
// how to use 'prettydiff' (it is quite different to use than other standard libs)
// https://github.com/prettydiff/prettydiff/issues/176
// https://github.com/sprity/sprity/blob/master/lib/style.js#L38-L53
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prettydiff = require('prettydiff')
prettydiff.options.mode = 'beautify'
prettydiff.options.indent_char = ' '

type HoverType = 'parentNameValue' | 'defReference' | 'tag' | 'content' | 'None'

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
  private readonly log: winston.Logger

  constructor(
    loadFolder: LoadFolder,
    projectManager: ProjectManager,
    private readonly rangeConverter: RangeConverter,
    private readonly refHover: DefReferenceHover,
    @inject(LogToken) baseLogger: winston.Logger
  ) {
    super(loadFolder, projectManager)
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
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

  private onHover(projects: Project[], uri: URI, pos: ls.Position): ls.Hover | null | undefined {
    const offset = this.rangeConverter.toOffset(pos, uri.toString())
    if (!offset) {
      return null
    }

    const getHoverType: (proj: Project, node: Node) => HoverType = (proj: Project, node: Node) => {
      if (isPointingDefReferenceContent(node, offset)) {
        return 'defReference'
      } else if (isPointingParentNameAttributeValue(node, offset)) {
        return 'parentNameValue'
      } else if (isPointingInjectableTag(node, offset)) {
        return 'tag'
      } else if (node instanceof Text && node.parent instanceof Injectable) {
        return 'content'
      }

      return 'None'
    }

    for (const proj of projects) {
      const doc = proj.getXMLDocumentByUri(uri)
      const node = doc?.findNodeAt(offset)
      if (!node) {
        continue
      }
      const hoverType = getHoverType(proj, node)

      const res = (() => {
        switch (hoverType) {
          case 'defReference':
            return this.refHover.onReferenceHover(proj, uri, pos)

          case 'None':
            return null
        }
      })()

      if (res) {
        return res
      }
    }

    return null
  }
}
