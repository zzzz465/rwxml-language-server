import { URI } from 'vscode-uri'
import * as path from 'path'

export function ext(uri: URI) {
  const str = uri.fsPath
  return path.extname(str)
}

export function isXML(uri: URI) {
  return ext(uri) === '.xml'
}
