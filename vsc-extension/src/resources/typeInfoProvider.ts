import { registry } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { extractTypeInfos } from '../typeInfo'
import { Provider, ProviderSymbol } from './type'
import * as vscode from 'vscode'

@registry([
  {
    token: ProviderSymbol,
    useClass: TypeInfoProvider,
  },
])
export class TypeInfoProvider implements Provider {
  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  private async onTypeInfoRequest({ uris }: TypeInfoRequest): Promise<TypeInfoRequestResponse> {
    try {
      const fsPaths = uris.map((uri) => vscode.Uri.parse(uri).fsPath)

      const typeInfos = await extractTypeInfos(...fsPaths)

      return { data: typeInfos }
    } catch (err) {
      return { error: String(err) }
    }
  }
}
