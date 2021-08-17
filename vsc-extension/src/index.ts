import { ExtensionContext, workspace } from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient'
import path from 'path'

let client: LanguageClient

export async function activate(context: ExtensionContext): Promise<void> {
  // initalize language server
  console.log('initializing @rwxml-language-server/vsc-extension ...')
  client = await initServer()

  // wait server to be ready
  client.start()
  await client.onReady()
  console.log('initialization completed.')

  // send event when project file changes
}

export function deactivate() {
  if (client) {
    return client.stop()
  }
}

async function initServer() {
  const modulePath = path.join(__dirname, '..', '..', 'language-server', 'dist', 'index.js')

  const serverOptions: ServerOptions = {
    run: { module: modulePath, transport: TransportKind.ipc },
    debug: {
      module: modulePath,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009'],
      },
    },
  }
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      {
        scheme: 'file',
        language: 'xml',
      },
    ],
  }

  const client = new LanguageClient('rwxml-language-server', 'RWXML Language Server', serverOptions, clientOptions)

  return client
}
