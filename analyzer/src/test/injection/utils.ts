import { RawTypeInfo, TypeInfoInjector, TypeInfoLoader } from '../../rimworld-types'
import core from './core.json'

export function getInjector() {
  const map = TypeInfoLoader.load(core as RawTypeInfo[])
  return new TypeInfoInjector(map)
}
