import { injectable, registry } from 'tsyringe'
import { Mod } from '../mod/mod'
import { XMLResource } from './resource'
import { ResourceProvider, ResourceProviderSymbol } from './resourceProvider'

@registry([
  {
    token: ResourceProviderSymbol,
    useClass: XMLResourceProvider,
  },
])
export class XMLResourceProvider implements ResourceProvider<XMLResource> {
  getResource(mod: Mod, version: string, uri: string): Promise<XMLResource[]> {
    throw new Error('Method not implemented.')
  }
  getResources(mod: Mod, version: string): Promise<XMLResource[]> {
    throw new Error('Method not implemented.')
  }
}
