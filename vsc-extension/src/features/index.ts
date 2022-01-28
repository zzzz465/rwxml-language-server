import { Disposable } from 'vscode'
import * as codeLens from './codeLens'
import * as deco from './deco'

export function registerFeatures(): Disposable[] {
  return [codeLens.registerFeature(), ...deco.registerDecoHook()]
}
