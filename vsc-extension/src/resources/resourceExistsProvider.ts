import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { Provider } from './provider'
import * as vscode from 'vscode'
import { ResourceExistsRequest, ResourceExistsRequestResponse } from '../events'
import * as fs from 'fs'

@injectable()
export class ResourceExistsProvider implements Provider {
  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(ResourceExistsRequest, this.onResourceExists.bind(this))
  }

  private async onResourceExists({ uri }: ResourceExistsRequest): Promise<ResourceExistsRequestResponse> {
    // fs.access() is recommended over fs.stat()
    const fsPath = vscode.Uri.parse(uri).fsPath
    return new Promise((res) => {
      fs.access(fsPath, (err) => {
        if (err != null) {
          res({ uri, exists: false })
        } else {
          res({ uri, exists: true, error: err })
        }
      })
    })
  }
}
