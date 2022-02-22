import { inject, injectable } from 'tsyringe'
import { Connection, MarkupContent } from 'vscode-languageserver'
import { Provider } from '../provider'
import * as winston from 'winston'
import * as ls from 'vscode-languageserver'
import { RangeConverter } from '../../utils/rangeConverter'
import { URI } from 'vscode-uri'
import { LoadFolder } from '../../mod/loadfolders'
import { ProjectManager } from '../../projectManager'
import { Project } from '../../project'
import { Element } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import { TextDocumentManager } from '../../textDocumentManager'
import { Definition } from '../definition'
import { FileStore } from '../../fileStore'
import { DependencyFile } from '../../fs'
import { LogToken } from '../../log'
// how to use 'prettydiff' (it is quite different to use than other standard libs)
// https://github.com/prettydiff/prettydiff/issues/176
// https://github.com/sprity/sprity/blob/master/lib/style.js#L38-L53
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prettydiff = require('prettydiff')
prettydiff.options.mode = 'beautify'
prettydiff.options.indent_char = ' '

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
    private readonly textDocumentManager: TextDocumentManager,
    private readonly definitionProvider: Definition,
    private readonly fileStore: FileStore,
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

  private onHover(projects: Project[], uri: URI, position: ls.Position): ls.Hover | null | undefined {
    const text = this.textDocumentManager.get(uri.toString())?.getText()
    if (!text) {
      return
    }

    const defs = projects.map((proj) => this.definitionProvider.findDefs(proj, uri, position)).flat()
    if (defs.length === 0) {
      return
    }

    const def = defs[0]

    const contents: MarkupContent = {
      kind: 'markdown',
      value: '',
    }

    const formattedXML = this.getTargetXMLString(def)
    const sourceUri = URI.parse(def.document.uri)
    const sourceFile = this.fileStore.get(def.document.uri)
    let packageId = 'local'
    if (sourceFile && DependencyFile.is(sourceFile)) {
      packageId = sourceFile.ownerPackageId
    }

    // https://code.visualstudio.com/api/extension-guides/command#command-uris
    // https://code.visualstudio.com/api/references/commands

    contents.value += `\
\`\`\`xml
${formattedXML}
\`\`\`
-------
packageId: \`${packageId}\`  
source: [${sourceUri.fsPath}](${sourceUri.toString()})
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
    if (defNameNodeIndex >= elem.ChildElementNodes.length) {
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
    let formatted = ''
    try {
      // https://github.com/prettydiff/prettydiff/blob/master/index.d.ts
      // https://stackoverflow.com/questions/19822460/pretty-diff-usage/30648547
      // https://github.com/prettydiff/prettydiff/tree/101.0.0#nodejs
      prettydiff.options.source = raw
      formatted = prettydiff()
    } catch (err) {
      console.error((err as Error).message)
    }

    const lines = formatted.split('\n')
    const i = 7
    if (lines.length > i) {
      formatted = lines.slice(0, i).join('\n')
      const indent = lines[i - 1].match(/\B( )+/)?.[0] as string
      formatted += '\n' + indent + '...'
      formatted += '\n' + lines[lines.length - 1]
    } else {
      formatted = lines.join('\n')
    }

    return formatted
  }
}
