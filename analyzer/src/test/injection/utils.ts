import { RawTypeInfo, TypeInfoInjector, TypeInfoLoader } from '../../rimworld-types'
import data from './anty.json'

const map = TypeInfoLoader.load(data as RawTypeInfo[])
export function getInjector() {
  return new TypeInfoInjector(map)
}
