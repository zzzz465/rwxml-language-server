import normalizePath from 'normalize-path'
import { URI } from 'vscode-uri'
import path from 'path'
import _ from 'lodash'
import { RimWorldVersion, RimWorldVersionArray } from '../typeInfoMapManager'

const versionRegex = /.*([\\d]\.[\\d]).*/

export function getVersion(uri: string | URI): RimWorldVersion {
  if (typeof uri === 'string') {
    uri = URI.parse(uri)
  }

  const fsPath = path.normalize(normalizePath(uri.fsPath))
  const version = _.findLast(fsPath.split('/'), versionRegex.test.bind(versionRegex)) ?? ''

  if (RimWorldVersionArray.includes(<any>version)) {
    return version as RimWorldVersion
  } else {
    return 'default'
  }
}
