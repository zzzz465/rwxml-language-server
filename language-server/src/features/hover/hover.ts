import { Def, Node, Text, TypedElement } from '@rwxml/analyzer'
import { injectable } from 'tsyringe'
import * as ls from 'vscode-languageserver'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import defaultLogger, { withClass } from '../../log'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { Provider } from '../provider'
import {
  isOffsetOnCloseTag,
  isOffsetOnOpenTag,
  isPointingParentNameAttributeValue,
  isTextReferencingDef,
} from '../utils/node'
import { ProjectHelper } from '../utils/project'
import { DefHoverProvider } from './def'
import { DefReferenceHover } from './defReference'
import { ParentNameAttribValueHover } from './parentNameAttribValue'
import { TagHoverProvider } from './tag'
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
  private log = winston.createLogger({
    format: winston.format.combine(withClass(HoverProvider)),
    transports: [defaultLogger()],
  })

  constructor(
    private readonly rangeConverter: RangeConverter,
    private readonly refHover: DefReferenceHover,
    private readonly parentNameAttribValueHover: ParentNameAttribValueHover,
    private readonly tagHoverProvider: TagHoverProvider,
    private readonly defHoverProvider: DefHoverProvider,
    private readonly projectHelper: ProjectHelper
  ) {}

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
      } else if (
        node instanceof TypedElement &&
        (isOffsetOnOpenTag(node, offset) || isOffsetOnCloseTag(node, offset))
      ) {
        return 'tag'
      } else if (node instanceof Text && node.parent instanceof TypedElement) {
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
      this.log.debug(`hover type: ${hoverType}, className: ${node.constructor.name}`)

      const res = ((): ls.Hover | null => {
        switch (hoverType) {
          case 'defReference':
            return this.refHover.onReferenceHover(proj, uri, pos)

          case 'parentNameValue':
            return this.parentNameAttribValueHover.onReferenceHover(proj, node)

          case 'tag':
            return this.tagHoverProvider.onTagHover(node as TypedElement, offset)

          case 'def':
            return this.defHoverProvider.onDefHover(node as Def, offset)

          default:
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
