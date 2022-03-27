import { Node } from '@rwxml/analyzer'
import * as ls from 'vscode-languageserver'
import { Project } from '../../project'

export interface CodeCompletionContributor {
  getCompletion(project: Project, node: Node, offset: number): ls.CompletionList | null
}
