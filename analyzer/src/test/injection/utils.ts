import { RawTypeInfo, TypeInfoInjector, TypeInfoLoader } from '../../rimworld-types'
import core from './core.json'

const map = TypeInfoLoader.load(core as RawTypeInfo[])
export function getInjector() {
  return new TypeInfoInjector(map)
}
