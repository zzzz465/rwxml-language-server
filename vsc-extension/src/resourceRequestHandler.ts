import { container, singleton } from 'tsyringe'
import { ModManager } from './mod/modManager'
import { Resource } from './resourceProvider/resource'
import { ResourceProvider, ResourceProviderSymbol } from './resourceProvider/resourceProvider'

@singleton()
export class ResourceRequestHandler {
  constructor(private readonly modManager: ModManager) {}

  private async onResourceRequest(packageId: string, version: string, resourceUri?: string): Promise<void> {
    // TODO: add return type
    if (resourceUri) {
      return this.resourceRequest(packageId, version, resourceUri)
    } else {
      return this.BulkResourceRequest(packageId, version)
    }
  }

  private async resourceRequest(packageId: string, version: string, resourceUri: string) {
    const mod = this.modManager.getMod(packageId)
    if (!mod) {
      throw new Error(`mod ${mod} not exists on table`)
    }

    const resourceProviders = this.getResourceProviders()
    const resources: Resource[] = []

    for (const provider of resourceProviders) {
      const resource = await provider.getResource(mod, version, resourceUri)
      resources.push(...resource)
    }

    return resources
  }

  private async BulkResourceRequest(packageId: string, version: string) {
    throw new Error('not implemented')
  }

  private getResourceProviders() {
    return container.resolveAll<ResourceProvider>(ResourceProviderSymbol)
  }
}
