import * as codeLens from './codeLens'
export * from './deco'

export function registerFeatures() {
  return [codeLens.registerFeature()]
}
