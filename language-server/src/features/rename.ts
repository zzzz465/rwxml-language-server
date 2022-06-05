import { injectable } from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'
import { RangeConverter } from '../utils/rangeConverter'
import { Definition } from './definition'
import { Reference } from './reference'
import { WritableChecker } from './writableChecker'

type Result = {
  [url: string]: lsp.TextEdit[]
}

@injectable()
export class Rename {
  constructor(
    private readonly reference: Reference,
    private readonly definition: Definition,
    private readonly rangeConverter: RangeConverter,
    private readonly writableChecker: WritableChecker
  ) {}

  rename(project: Project, uri: URI, newName: string, pos: lsp.Position): Result {
    const result: Result = {}

    return result
    /*
    const offset = this.rangeConverter.toOffset(pos, uri.toString())
    if (_.isNil(offset)) {
      return result
    }

    if (!this.writableChecker.canWrite(uri.toString())) {
      return result
    }

    const data = getNodeAndOffset(project, uri, pos)
    if (!data) {
      return result
    }

    const defNodes = this.definition.findDefinitions(project, uri, offset)
    if (option.isNone(defNodes) || defNodes.value.length === 0) {
      return result
    }

    const def = defNodes.value[0]

    const definitionEditRange = this.rangeConverter.toLanguageServerRange(def.contentRange, uri.toString())
    if (!definitionEditRange) {
      return result
    }

    const referenceNodes = this.reference.findDefReference(project, def, data.offset)
    if (!referenceNodes) {
      return result
    }

    const dict = new DefaultDictionary<string, lsp.TextEdit[]>(() => [])

    // add definition edit
    dict.getValue(uri.toString()).push({ newText: newName, range: definitionEditRange })

    // add reference edits
    for (const ref of referenceNodes) {
      if (!project.resourceStore.isDependencyFile(ref.uri)) {
        dict.getValue(ref.uri).push({ newText: newName, range: ref.range })
      }
    }

    for (const key of dict.keys()) {
      result[key] = dict.getValue(key)
    }

    return result
    */
  }
}
