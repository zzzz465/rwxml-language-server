import { Hover } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'

export function onHover(project: Project, uri: URI): Hover[] {
  return []
}
