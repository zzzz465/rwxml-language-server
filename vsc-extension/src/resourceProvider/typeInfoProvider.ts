import { registry } from 'tsyringe'
import { Mod } from '../mod'
import { XMLResource } from './resource'
import { ResourceProvider, ResourceProviderSymbol } from './resourceProvider'

@registry([
  {
    token: ResourceProviderSymbol,
    useClass: TypeInfoProvider,
  },
])
export class TypeInfoProvider implements ResourceProvider {
  getResource(mod: Mod, version: string, uri: string): Promise<XMLResource[]> {
    throw new Error('Method not implemented.')
  }
  getResources(mod: Mod, version: string): Promise<XMLResource[]> {
    throw new Error('Method not implemented.')
  }
}
