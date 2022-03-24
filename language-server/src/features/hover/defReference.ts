import * as tsyringe from 'tsyringe'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import * as ls from 'vscode-languageserver'
import { Element } from '@rwxml/analyzer'
import { Definition } from '../definition'
import { AsEnumerable } from 'linq-es2015'
import { MarkupContent } from 'vscode-languageserver'
import { FileStore } from '../../fileStore'
import { DependencyFile } from '../../fs'
// how to use 'prettydiff' (it is quite different to use than other standard libs)
// https://github.com/prettydiff/prettydiff/issues/176
// https://github.com/sprity/sprity/blob/master/lib/style.js#L38-L53
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prettydiff = require('prettydiff')
prettydiff.options.mode = 'beautify'
prettydiff.options.indent_char = ' '

@tsyringe.injectable()
export class DefReferenceHover {
  constructor(private readonly defProvider: Definition, private readonly fileStore: FileStore) {}

  onReferenceHover(project: Project, uri: URI, position: ls.Position): ls.Hover | null {
    const defs = this.defProvider.findDefsFromUriWithPos(project, uri, position)
    const def = AsEnumerable(defs).FirstOrDefault()

    if (!def) {
      return null
    }

    const contents: MarkupContent = { kind: 'markdown', value: '' }
    const referenceXMLString = this.getReferenceXMLString(def)
    const packageId = this.getPackageId(def.document.uri)
    const sourceUri = URI.parse(def.document.uri)

    contents.value = [
      '```xml',
      referenceXMLString,
      '```',
      '--------',
      `packageId: \`${packageId}\``,
      `source: [${sourceUri.fsPath}](${sourceUri.toString()})`,
    ].join('  \n')

    return { contents }
  }

  private getPackageId(uri: string) {
    const file = this.fileStore.get(uri)

    if (file && DependencyFile.is(file)) {
      return file.ownerPackageId
    }

    return 'local'
  }

  private getReferenceXMLString(elem: Element): string {
    // find defName node
    const defNameNodeIndex = elem.ChildElementNodes.findIndex((el) => el.tagName === 'defName')
    if (defNameNodeIndex >= elem.ChildElementNodes.length) {
      // if no defName node exists?
      return 'GET_TARGET_XML_STRING_UNDEFINED'
    }

    // pick other nodes to show.
    // does it returns null if take is over array length?
    const total = 6
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
