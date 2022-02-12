import { Mod } from '../mod'
import { Resource } from './resource'

export const ResourceProviderSymbol = Symbol('ResourceProviderSymbol')

export interface ResourceProvider<T extends Resource = Resource> {
  getResource(mod: Mod, version: string, uri: string): Promise<T[]>
  getResources(mod: Mod, version: string): Promise<T[]>
}
