/* eslint-disable @typescript-eslint/no-empty-function */
import * as path from 'path'
import 'reflect-metadata'
import { container } from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient'
import * as commands from './commands'
import { ExtensionContextToken } from './extension'
import { ExtensionLog } from './extensionLog'
import * as features from './features'
import checkInsider from './insiderCheck'
import { log, LogManager } from './log'
import { ModManager, PathStore } from './mod'
import { UpdateNotification } from './notification/updateNotification'
import { ProjectWatcher } from './projectWatcher'
import * as resources from './resources'
import { checkTypeInfoAnalyzeAvailable } from './typeInfo'
import { ExtensionVersionToken } from './version'

const disposables: vscode.Disposable[] = []

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. reset container && set extensionContext
  container.clearInstances()

  container.register(ExtensionVersionToken, { useValue: context.extension.packageJSON.version as string })
  container.register(ExtensionContextToken, { useValue: context })

  // init logger
  const logManager = container.resolve(LogManager)
  disposables.push(logManager.init())

  log.add(new ExtensionLog())
  // log.add(new winston.transports.File({ dirname: context.logUri.fsPath, filename: 'client.log', level: 'silly' }))
  // console.log(`writing logs to ${context.logUri.fsPath}`)

  // check insider version exists (main / insider cannot co-exists)
  await checkInsider()

  // check version is updated.
  const updateNotification = container.resolve(UpdateNotification)
  updateNotification.checkFirstRunThisVersion()

  // 2. initialize containers (set values)

  // 2-2. register commands
  log.info('registering commands...')
  disposables.push(...commands.initialize())

  // 3. initialize language server
  log.info('initializing Language Server...')
  const client = await createServer()

  // 4. init resourceProvider
  log.info('initializing resourceProviders...')
  const resourceProviders = container.resolveAll<resources.Provider>(resources.Provider.token)
  resourceProviders.forEach((resource) => resource.listen(client))

  // 4. initialize modManager, dependencyManager
  const modManager = container.resolve(ModManager)
  await modManager.init()

  // 5. start language server and wait
  client.start()
  await client.onReady()

  // initialize token provider (no used)
  // const semanticTokenProvider = container.resolve(SemanticTokenProvider)
  // vscode.languages.registerDocumentSemanticTokensProvider(
  //   { language: 'xml', scheme: 'file' },
  //   semanticTokenProvider,
  //   semanticTokenProvider.legend
  // )

  // 6. initialize && wait Runtime TypeInfo Extractor
  log.info('checking Runtime TypeInfo Extractor available...')
  if (!checkTypeInfoAnalyzeAvailable()) {
    log.error('extractor is not available. extension might not work...')
  }

  // 7. send mod list to language server
  // TODO: this feature is moved to projectWatcher
  // it sends all watched file on init (before watching)

  // 8. add decorate update
  log.info('register lsp features...')
  disposables.push(...features.registerFeatures())

  // 9. set project watcher
  log.info('initialize Project Watcher...')
  container.resolve(ProjectWatcher).start()

  log.info('initialization completed.')
}

export function deactivate(): void {
  const client = container.resolve(LanguageClient)
  if (!client) {
    throw new Error('trying to deactivate extension, but it was never initialized.')
  }

  client.stop()
  disposables.map((disposable) => disposable.dispose())
}

async function createServer(): Promise<LanguageClient> {
  const context = container.resolve<vscode.ExtensionContext>(ExtensionContextToken)
  const pathStore = container.resolve<PathStore>(PathStore.token)
  const module = path.join(context.extensionPath, pathStore.LanguageServerModulePath)
  log.debug(`server module absolute path: ${module}`)

  const serverOptions: ServerOptions = {
    run: { module, transport: TransportKind.ipc },
    debug: {
      module,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009', '--expose-gc', '--max-old-space-size=8192'],
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
    initializationOptions: {
      logs: {
        level: container.resolve(LogManager).level(),
      },
    },
  }

  const client = new LanguageClient('rwxml-language-server', 'RWXML Language Server', serverOptions, clientOptions)
  container.register(LanguageClient, { useValue: client })

  return client
}
