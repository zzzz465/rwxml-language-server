import vscode, { ExtensionContext } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { SerializedXMLDocumentRequest } from '../events'
import { log } from '../log'

export function printXMLDocumentObjectHandler(context: ExtensionContext, client: LanguageClient) {
  return async function (): Promise<void> {
    if (vscode.window.activeTextEditor) {
      const uri = vscode.window.activeTextEditor.document.uri.toString()
      log.debug(`printXMLDocumentObjectHandler, uri: ${uri}`)

      const requestParams: SerializedXMLDocumentRequest = {
        uri,
      }

      const response = await client.sendRequest(SerializedXMLDocumentRequest, requestParams)

      if (response.document) {
        log.debug(JSON.stringify(response.document))
      } else {
        log.debug(`document ${uri} is not exist.`)
      }
    }
  }
}
