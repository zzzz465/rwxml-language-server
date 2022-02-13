import { injectable } from 'tsyringe'
import { CompletionList } from 'vscode-languageserver'
import { Position } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { CompleteAttribute } from './attribute'
import { DefNameCompletion } from './defName'
import { OpenTagCompletion } from './opentag'
import { ResourcePath } from './resourcePath'

@injectable()
export class CodeCompletion {
  constructor(
    private readonly rangeConverter: RangeConverter,
    private readonly completeAttribute: CompleteAttribute,
    private readonly openTagCompletion: OpenTagCompletion,
    private readonly resourcePathCompletion: ResourcePath,
    private readonly defNameCompletion: DefNameCompletion
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

    const openTagCompletions = this.openTagCompletion.complete(project, targetNode, offset)
    ret.items.push(...openTagCompletions)
    const attributes = this.completeAttribute.completeAttribute(project, targetNode, offset)
    ret.items.push(...attributes)
    const resourcePaths = this.resourcePathCompletion.complete(project, targetNode, offset)
    ret.items.push(...resourcePaths)
    const defNames = this.defNameCompletion.complete(project, targetNode, offset)
    ret.items.push(...defNames)

    return ret
  }
}
