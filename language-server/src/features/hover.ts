import { injectable } from 'tsyringe'
import { Connection, MarkupContent } from 'vscode-languageserver'
import { Provider } from './provider'
import * as winston from 'winston'
import * as ls from 'vscode-languageserver'
import { RangeConverter } from '../utils/rangeConverter'
import { URI } from 'vscode-uri'
import { LoadFolder } from '../mod/loadfolders'
import { ProjectManager } from '../projectManager'
import { Project } from '../project'
import { Element, parse } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import { TextDocumentManager } from '../textDocumentManager'
import 'prettydiff'

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

  constructor(
    loadFolder: LoadFolder,
    projectManager: ProjectManager,
    private readonly rangeConverter: RangeConverter,
    private readonly textDocumentManager: TextDocumentManager
  ) {
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
    const text = this.textDocumentManager.get(uri.toString())?.getText()
    if (!text) {
      return
    }

    const doc = parse(text)
    const offset = this.rangeConverter.toOffset(position, uri.toString())
    if (!offset) {
      return
    }

    const node = doc.findNodeAt(offset)
    if (!(node instanceof Element)) {
      return
    }

    const contents: MarkupContent = {
      kind: 'markdown',
      value: '',
    }

    const formattedXML = this.getTargetXMLString(node)

    contents.value += `\
\`\`\`yaml
${formattedXML}
\`\`\`
`

    // NOTE: property range 는 뭐하는거지?
    return { contents }
  }

  /**
   * getTargetXMLString returns minified version of the target xml def
   */
  private getTargetXMLString(elem: Element): string {
    // find defName node
    const defNameNodeIndex = elem.ChildElementNodes.findIndex((el) => el.tagName === 'defName')
    if (!defNameNodeIndex) {
      // if no defName node exists?
      return 'GET_TARGET_XML_STRING_UNDEFINED'
    }

    // pick other nodes to show.
    // does it returns null if take is over array length?
    const total = 3
    const childNodes = AsEnumerable(elem.ChildElementNodes).Skip(defNameNodeIndex).Take(total).ToArray()

    if (childNodes.length < total) {
      const take = defNameNodeIndex - 1
      const nodes2 = AsEnumerable(elem.ChildElementNodes)
        .Take(take >= 0 ? take : 0)
        .Reverse()
        .Take(total - childNodes.length)
        .ToArray()

      childNodes.push(...nodes2)
    }

    // stringify nodes and minify
    const clonedDef = elem.cloneNode()
    clonedDef.children = childNodes // does it breaks capsulation?
    const raw = clonedDef.toString()

    // format using prettydiff
    let formatted = prettydiff(raw)

    const lines = formatted.split('\n')
    const i = 7
    if (lines.length > i) {
      formatted = lines.slice(0, i).join('\n')
      const indent = lines[i - 1].match(/\A( )+/)?.[0] as string
      formatted += '\n' + indent + '...'
      formatted += '\n' + lines[lines.length - 1]
    } else {
      formatted = lines.join('\n')
    }

    return formatted
  }
}
