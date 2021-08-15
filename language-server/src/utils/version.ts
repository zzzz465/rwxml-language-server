import normalizePath from 'normalize-path'
import { URI } from 'vscode-uri'
import path from 'path'
import _ from 'lodash'
import { RimWorldVersion } from 'src/typeInfoMapManager'

const versionRegex = /.*([\\d]\.[\\d]).*/

export function getVersion(uri: string | URI): RimWorldVersion {
  if (typeof uri === 'string') {
    uri = URI.parse(uri)
  }

  const fsPath = path.normalize(normalizePath(uri.fsPath))
  const version = _.findLast(fsPath.split('/'), versionRegex.test)

  return version ?? 'default'
}
