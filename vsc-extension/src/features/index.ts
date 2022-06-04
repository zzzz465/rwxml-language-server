import { Disposable } from 'vscode'
import * as codeLens from './codeLens'
import * as deco from './deco'
import * as displayDefs from './displayDefs'
import * as displayTypeInfo from './displayTypeInfo'

export function registerFeatures(): Disposable[] {
  return [
    ...deco.registerDecoHook(),
    ...codeLens.registerFeature(),
    displayTypeInfo.registerFeature(),
    displayDefs.registerFeature(),
  ]
}
