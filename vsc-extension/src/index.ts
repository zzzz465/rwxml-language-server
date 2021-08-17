import { Disposable, ExtensionContext } from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient'
import { printXMLDocumentObjectHandler } from './commands'
import * as path from 'path'
import vscode from 'vscode'
import { updateDecoration } from './features'

let client: LanguageClient
let disposed = false
const disposables: Disposable[] = []

export async function activate(context: ExtensionContext): Promise<void> {
  // initalize language server
  console.log('initializing @rwxml-language-server/vsc-extension ...')
  client = await initServer()

  // register commands
  console.log('register commands...')
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rwxml:debug:printXMLDocumentObject',
      printXMLDocumentObjectHandler(context, client)
    )
  )

  console.log('registering commands done.')

  console.log('register client features...')
  console.log('register updateDecoration on onDidChangeActiveTextEditor')
  vscode.window.onDidChangeActiveTextEditor(
    (e) => {
      if (e?.document.uri) {
        updateDecoration(client, e.document.uri.toString())
      }
    },
    undefined,
    disposables
  )

  console.log('register updateDecoration on onDidChangeTextDocument')
  vscode.workspace.onDidChangeTextDocument(
    (e) => {
      if (e.document.uri) {
        updateDecoration(client, e.document.uri.toString())
      }
    },
    undefined,
    disposables
  )

  console.log('registering client features done.')

  // wait server to be ready
  console.log('waiting language-server to be ready...')
  client.start()
  await client.onReady()

  console.log('initialization completed.')
}

export function deactivate() {
  if (client) {
    return client.stop()
  }

  if (!disposed) {
    disposables.map((d) => d.dispose())
    disposed = true
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
