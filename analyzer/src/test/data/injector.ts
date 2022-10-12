import { RawTypeInfo, TypeInfoInjector, TypeInfoLoader } from '../../rimworld-types'
import data_1_4 from './typeinfo-1_4.json'

export const injector_1_4 = new TypeInfoInjector(TypeInfoLoader.load((data_1_4 as any).rawData as RawTypeInfo[]))
