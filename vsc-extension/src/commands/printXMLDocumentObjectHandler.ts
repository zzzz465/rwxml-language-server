import { ExtensionContext } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { SerializedXMLDocumentRequest } from '../events'
import vscode from 'vscode'

export function printXMLDocumentObjectHandler(context: ExtensionContext, client: LanguageClient) {
  return async function () {
    if (vscode.window.activeTextEditor) {
      const uri = vscode.window.activeTextEditor.document.uri.toString()
      console.log(`printXMLDocumentObjectHandler, uri: ${uri}`)

      const requestParams: SerializedXMLDocumentRequest = {
        uri,
      }

      const response = await client.sendRequest(SerializedXMLDocumentRequest, requestParams)

      if (response.document) {
        console.log(JSON.stringify(response.document))
      } else {
        console.log(`document ${uri} is not exist.`)
      }
    }
  }
}
