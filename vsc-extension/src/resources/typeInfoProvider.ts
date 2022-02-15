import { injectable } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { extractTypeInfos } from '../typeInfo'
import { Provider } from './provider'
import * as vscode from 'vscode'
import { createProgress } from '../utils/progress'

@injectable()
export class TypeInfoProvider implements Provider {
  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  private requestCounter = 0
  private clearProgress: (() => void) | null = null

  private async onTypeInfoRequest({ uris }: TypeInfoRequest): Promise<TypeInfoRequestResponse> {
    const res: TypeInfoRequestResponse = {}
    const fsPaths = uris.map((uri) => vscode.Uri.parse(uri).fsPath)

    console.log('typeInfoRequest received request for: ', fsPaths)

    if (!this.clearProgress) {
      const { resolve } = await createProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'RWXML: reading DLLs...',
      })
      this.clearProgress = resolve
    }

    this.requestCounter += 1

    try {
      const typeInfos = await extractTypeInfos(...fsPaths)

      res.data = typeInfos
    } catch (err) {
      // https://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
      res.error = JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
      console.error(JSON.stringify(res, null, 2))
    }

    this.requestCounter -= 1
    console.assert(
      this.requestCounter >= 0,
      'TypeInfoProvider.requestCount must be greater or equal 0, value: %d',
      this.requestCounter
    )

    if (this.requestCounter === 0) {
      console.assert(this.clearProgress !== null)
      this.clearProgress()
      this.clearProgress = null
    }

    return res
  }
}
