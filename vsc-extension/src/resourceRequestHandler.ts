import { container, singleton } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TextRequest, TextRequestResponse } from './events'
import { ModManager } from './mod/modManager'

/**
 * @deprecated
 */
@singleton()
export class ResourceRequestHandler {
  constructor(private readonly modManager: ModManager) {}

  listen(client: LanguageClient) {
    client.onReady().then(() => {
      client.onRequest(TextRequest, this.onResourceRequest.bind(this))
    })
  }

  private async onTextRequest({ uri }: TextRequest): Promise<TextRequestResponse> {

  }

  private async onTypeInfoRequest({ uris }: )

  private async onResourceRequest({ uri }: TextRequest): Promise<TextRequestResponse> {
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
