import ono from 'ono'
import { injectable } from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient, ResponseError } from 'vscode-languageclient'
import { TextRequest, TextRequestResponse } from '../events'
import { Provider } from './provider'

@injectable()
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
      // TODO: handle error
      const err2 = ono(err as any)
      return new ResponseError(1, err2.message, err2)
    }
  }
}
