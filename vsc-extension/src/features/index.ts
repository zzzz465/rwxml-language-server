import { Disposable } from 'vscode'
import * as codeLens from './codeLens'
import * as deco from './deco'
import * as displayTypeInfo from './displayTypeInfo'

export function registerFeatures(): Disposable[] {
  return [codeLens.registerFeature(), ...deco.registerDecoHook(), displayTypeInfo.registerFeature()]
}
