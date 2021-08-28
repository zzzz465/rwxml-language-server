import normalizePath from 'normalize-path'
import { URI } from 'vscode-uri'
import * as path from 'path'
import _ from 'lodash'
import { RimWorldVersion, RimWorldVersionArray } from '../typeInfoMapManager'

const versionRegex = /.*([\d]\.[\d]).*/

export function getVersion(uri: string | URI): RimWorldVersion {
  if (typeof uri === 'string') {
    uri = URI.parse(uri)
  }

  const fsPaths = normalizePath(uri.fsPath).split('/')
  const version = _.findLast(fsPaths, versionRegex.test.bind(versionRegex)) ?? ''

  if (RimWorldVersionArray.includes(<any>version)) {
    return version as RimWorldVersion
  } else {
    return 'default'
  }
}
