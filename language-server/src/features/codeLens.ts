import { CodeLens, CodeLensParams, ServerRequestHandler } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { Project } from '../project'

export function onCodeLens(project: Project, uri: URI): CodeLens[] {
  return []
}
