import { registry } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TextRequest, TextRequestResponse } from '../events'
import { Provider, ProviderSymbol } from './type'
import * as vscode from 'vscode'

@registry([
  {
    token: ProviderSymbol,
    useClass: TextProvider,
  },
])
export class TextProvider implements Provider {
  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TextRequest, this.onTextRequest.bind(this))
  }

  private async onTextRequest({ uri }: TextRequest): Promise<TextRequestResponse> {
    try {
      const data = await vscode.workspace.fs.readFile(vscode.Uri.parse(uri))
      const xml = Buffer.from(data).toString('utf-8')
      return { data: xml }
    } catch (err) {
      return { data: '', error: String(err) }
    }
  }
}
