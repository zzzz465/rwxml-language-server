import { inject, injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Provider } from '../provider'
import * as winston from 'winston'
import * as ls from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { LogToken } from '../../log'
import { DefReferenceHover } from './defReference'
import { Def, Injectable, Node, Text } from '@rwxml/analyzer'
import { RangeConverter } from '../../utils/rangeConverter'
import { isTextReferencingDef, isPointingInjectableTag, isPointingParentNameAttributeValue } from '../utils/node'
import { ParentNameAttribValueHover } from './parentNameAttribValue'
import { TagHoverProvider } from './tag'
import { DefHoverProvider } from './def'
import { ProjectHelper } from '../utils/project'
// how to use 'prettydiff' (it is quite different to use than other standard libs)
// https://github.com/prettydiff/prettydiff/issues/176
// https://github.com/sprity/sprity/blob/master/lib/style.js#L38-L53
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prettydiff = require('prettydiff')
prettydiff.options.mode = 'beautify'
prettydiff.options.indent_char = ' '

type HoverType = 'parentNameValue' | 'defReference' | 'tag' | 'content' | 'def' | 'None'

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
export class HoverProvider implements Provider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${HoverProvider.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(
    private readonly rangeConverter: RangeConverter,
    private readonly refHover: DefReferenceHover,
    private readonly parentNameAttribValueHover: ParentNameAttribValueHover,
    private readonly tagHoverProvider: TagHoverProvider,
    private readonly defHoverProvider: DefHoverProvider,
    private readonly projectHelper: ProjectHelper,
    @inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  protected getLogger(): winston.Logger {
    return this.log
  }

  init(connection: Connection): void {
    connection.onHover(this.projectHelper.wrapExceptionStackTraces(this.onHoverRequest.bind(this)))
  }

  private async onHoverRequest(p: ls.HoverParams): Promise<ls.Hover | null | undefined> {
    const uri = URI.parse(p.textDocument.uri)
    const projects = this.projectHelper.getProjects(uri)
    return this.onHover(projects, uri, p.position)
  }

  private onHover(projects: Project[], uri: URI, pos: ls.Position): ls.Hover | null | undefined {
    const offset = this.rangeConverter.toOffset(pos, uri.toString())
    if (!offset) {
      return null
    }

    const getHoverType: (proj: Project, node: Node) => HoverType = (proj: Project, node: Node) => {
      if (isTextReferencingDef(node)) {
        return 'defReference'
      } else if (isPointingParentNameAttributeValue(node, offset)) {
        return 'parentNameValue'
      } else if (isPointingInjectableTag(node, offset)) {
        return 'tag'
      } else if (node instanceof Text && node.parent instanceof Injectable) {
        return 'content'
      } else if (node instanceof Def) {
        return 'def'
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

          case 'parentNameValue':
            return this.parentNameAttribValueHover.onReferenceHover(proj, node)

          case 'tag':
            return this.tagHoverProvider.onTagHover(node as Injectable, offset)

          case 'def':
            return this.defHoverProvider.onDefHover(node as Def, offset)

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
