import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TypeInfoProvider } from './typeInfoProvider'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { Provider } from './provider'

@injectable()
export class CachedTypeInfoProvider implements Provider {
  constructor(private readonly typeInfoProvider: TypeInfoProvider) {}

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  private async onTypeInfoRequest({ uris }: TypeInfoRequest): Promise<TypeInfoRequestResponse> {
    throw new Error('method not implemented.')
  }
}
