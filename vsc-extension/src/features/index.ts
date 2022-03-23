import { Disposable } from 'vscode'
import * as codeLens from './codeLens'
import * as deco from './deco'
import * as displayTypeInfo from './displayTypeInfo'
import * as displayDefs from './displayDefs'

export function registerFeatures(): Disposable[] {
  return [
    ...deco.registerDecoHook(),
    codeLens.registerFeature(),
    displayTypeInfo.registerFeature(),
    displayDefs.registerFeature(),
  ]
}
