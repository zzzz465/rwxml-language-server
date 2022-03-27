import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import { CompletionList } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { CodeCompletionContributor } from './contributor'
import { CodeCompletionContributorRegistry } from './registry'

@tsyringe.injectable()
export class CodeCompletion {
  constructor(
    private readonly rangeConverter: RangeConverter,
    @tsyringe.injectAll(CodeCompletionContributorRegistry.token)
    private readonly contributors: CodeCompletionContributor[]
  ) {}

  codeCompletion(project: Project, uri: URI, position: Position): CompletionList {
    const xmlDocument = project.getXMLDocumentByUri(uri)
    const offset = this.rangeConverter.toOffset(position, uri.toString())
    const ret: CompletionList = { isIncomplete: true, items: [] }

    if (!xmlDocument || !offset) {
      return ret
    }

    const targetNode = xmlDocument.findNodeAt(offset)
    if (!targetNode) {
      return ret
    }

    return AsEnumerable(this.contributors)
      .Select((contributor) => contributor.getCompletion(project, targetNode, offset))
      .Where((res) => res !== null)
      .Cast<CompletionList>()
      .DefaultIfEmpty({
        isIncomplete: true,
        items: [],
      })
      .Aggregate((aggr, x) => {
        // aggr can be undefined if array is empty
        if (!aggr) {
          return x
        }

        aggr.isIncomplete ||= x.isIncomplete
        aggr.items.push(...x.items)

        return aggr
      })
  }
}
