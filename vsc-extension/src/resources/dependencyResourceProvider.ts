import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyRequest, DependencyRequestResponse } from '../events'
import { Provider } from './provider'
import * as vscode from 'vscode'

@injectable()
export class DependencyResourceProvider implements Provider {
  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(DependencyRequest, this.onDependencyRequest.bind(this))
  }

  private async onDependencyRequest({ packageId }: DependencyRequest): Promise<DependencyRequestResponse> {
    throw new Error('not implemented')
  }
}
