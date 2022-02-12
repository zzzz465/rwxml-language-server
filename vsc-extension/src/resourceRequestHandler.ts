import { container, singleton } from 'tsyringe'
import { ResourceRequest, ResourceRequestResponse } from './events'
import { ModManager } from './mod/modManager'
import { Resource } from './resourceProvider/resource'
import { ResourceProvider, ResourceProviderSymbol } from './resourceProvider/resourceProvider'

@singleton()
export class ResourceRequestHandler {
  constructor(private readonly modManager: ModManager) {}

  private async onResourceRequest({
    packageId,
    version,
    resourceUri,
  }: ResourceRequest): Promise<ResourceRequestResponse> {
    const mod = this.modManager.getMod(packageId)
    if (!mod) {
      throw new Error(`mod ${mod} not exists on table`)
    }

    const resourceProviders = this.getResourceProviders()
    const resources: Resource[] = []

    for (const provider of resourceProviders) {
      if (resourceUri) {
        const res = await provider.getResource(mod, version, resourceUri)
        resources.push(...res)
      } else {
        const res = await provider.getResources(mod, version)
        resources.push(...res)
      }
    }

    return { packageId, version, resources }
  }

  private getResourceProviders() {
    return container.resolveAll<ResourceProvider>(ResourceProviderSymbol)
  }
}
