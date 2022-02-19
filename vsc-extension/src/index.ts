/* eslint-disable @typescript-eslint/no-empty-function */
import 'reflect-metadata'
import * as vscode from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient'
import * as path from 'path'
import { container } from 'tsyringe'
import * as features from './features'
import { checkTypeInfoAnalyzeAvailable } from './typeInfo'
import * as containerVars from './containerVars'
import * as commands from './commands'
import { ProjectWatcher } from './projectWatcher'
import * as resources from './resources'
import { ModManager, PathStore } from './mod'
import { ExtensionVersionToken } from './version'
import { ExtensionContextToken } from './extension'
import { UpdateNotification } from './notification/updateNotification'
import checkInsider from './insiderCheck'

const disposables: vscode.Disposable[] = []

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. reset container && set extensionContext
  console.log('initializing @rwxml/vsc-extension...')
  container.clearInstances()

  container.register(ExtensionVersionToken, { useValue: context.extension.packageJSON.version as string })

  container.register(ExtensionContextToken, { useValue: context })

  // check insider version exists (main / insider cannot co-exists)
  await checkInsider()

  // check version is updated.
  const updateNotification = container.resolve(UpdateNotification)
  updateNotification.checkFirstRunThisVersion()

  // 2. initialize containers (set values)
  // automatically moved to pathStore

  // 2-2. register commands
  console.log('register commands...')
  disposables.push(...commands.initialize())

  // 3. initialize language server
  console.log('initializing Language Server...')
  const client = await createServer()

  // 4. init resourceProvider
  console.log('initializing resourceProviders...')
  const resourceProviders = container.resolveAll<resources.Provider>(resources.Provider.token)
  resourceProviders.forEach((resource) => resource.listen(client))

  // 4. initialize modManager, dependencyManager
  const modManager = container.resolve(ModManager)
  await modManager.init()

  // 5. start language server and wait
  client.start()
  await client.onReady()

  // 6. initialize && wait Runtime TypeInfo Extractor
  console.log('checking Runtime TypeInfo Extractor available...')
  checkTypeInfoAnalyzeAvailable()

  // 7. send mod list to language server
  // TODO: this feature is moved to projectWatcher
  // it sends all watched file on init (before watching)

  // 8. add decorate update
  console.log('register lsp features...')
  disposables.push(...features.registerFeatures())

  // 9. set project watcher
  console.log('initialize Project Watcher...')
  container.resolve(ProjectWatcher).start()

  console.log('initialization completed.')
}

export function deactivate() {
  const client = container.resolve(LanguageClient)
  if (!client) {
    throw new Error('trying to deactivate extension, but it was never initialized.')
  }

  client.stop()
  disposables.map((disposable) => disposable.dispose())
}

async function createServer() {
  const context = container.resolve<vscode.ExtensionContext>(ExtensionContextToken)
  const pathStore = container.resolve<PathStore>(PathStore.token)
  const serverModuleRelativePath = pathStore.defaultLanguageServerModulePath()
  const module = path.join(context.extensionPath, serverModuleRelativePath)
  console.log(`server module absolute path: ${module}`)

  const serverOptions: ServerOptions = {
    run: { module, transport: TransportKind.ipc },
    debug: {
      module,
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
  container.register(LanguageClient, { useValue: client })

  return client
}
