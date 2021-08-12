import { ExtensionContext } from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient'

let client: LanguageClient

export async function activate(context: ExtensionContext): Promise<void> {
  // initalize language server
  client = await initServer()

  // wait server to be ready
  client.start()
  await client.onReady()

  // send event when project file changes
}

export function deactivate() {
  if (client) {
    return client.stop()
  }
}

async function initServer() {
  const serverOptions: ServerOptions = {}
  const clientOptions: LanguageClientOptions = {}

  const client = new LanguageClient('rwxml-language-server', 'RWXML Language Server', serverOptions, clientOptions)

  return client
}
