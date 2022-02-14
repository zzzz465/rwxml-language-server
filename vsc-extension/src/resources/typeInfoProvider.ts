import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { extractTypeInfos } from '../typeInfo'
import { Provider } from './provider'
import * as vscode from 'vscode'

@injectable()
export class TypeInfoProvider implements Provider {
  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  private async onTypeInfoRequest({ uris }: TypeInfoRequest): Promise<TypeInfoRequestResponse> {
    console.log('typeInfoRequest received request for: ', uris)

    try {
      const fsPaths = uris.map((uri) => vscode.Uri.parse(uri).fsPath)

      const typeInfos = await extractTypeInfos(...fsPaths)

      return { data: typeInfos }
    } catch (err) {
      return { error: String(err) }
    }
  }
}
