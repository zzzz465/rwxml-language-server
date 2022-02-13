/* eslint-disable @typescript-eslint/no-empty-function */
import 'reflect-metadata'
import { Disposable, ExtensionContext, workspace } from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient'
import * as path from 'path'
import { container } from 'tsyringe'
import * as features from './features'
import { ModChangedNotificationParams, WorkspaceInitialization } from './events'
import { ModManager } from './mod/modManager'
import { checkTypeInfoAnalyzeAvailable } from './typeInfo'
import * as containerVars from './containerVars'
import * as commands from './commands'
import * as mods from './mod'
import { isXML } from './utils/path'
import { ProjectWatcher } from './projectWatcher'
import * as resources from './resources'

const disposables: Disposable[] = []

// TODO: delete this code
async function sendMods() {
  const client = container.resolve(LanguageClient)
  const modManager = container.resolve(ModManager)

  type simpleMod = {
    about: mods.SerializedAbout
  }

  const mods: simpleMod[] = modManager.mods.map((mod) => ({
    about: {
      name: mod.about.name,
      author: mod.about.author,
      packageId: mod.about.packageId,
      supportedVersions: mod.about.supportedVersions,
    },
  }))

  await client.sendNotification(ModChangedNotificationParams, { mods })
}

export async function activate(context: ExtensionContext): Promise<void> {
  // 1. reset container && set extensionContext
  console.log('initializing @rwxml/vsc-extension...')
  container.reset()

  container.register('ExtensionContext', { useValue: context })

  // 2. initialize containers (set values)
  console.log('initializing container variables...')
  disposables.push(containerVars.initialize())

  // 2-2. register commands
  console.log('register commands...')
  disposables.push(...commands.initialize())

  // 3. initialize language server
  console.log('initializing Language Server...')
  const client = await createServer()

  // 4. init resourceProvider
  const resourceProviders = container.resolveAll<resources.Provider>(resources.ProviderSymbol)
  resourceProviders.forEach((resource) => resource.listen(client))

  // 4. initialize modManager, dependencyManager
  console.log('initialize modManager, dependencyManager...')
  await mods.initialize()

  // 5. start language server and wait
  client.start()
  await client.onReady()

  // 6. initialize && wait Runtime TypeInfo Extractor
  console.log('checking Runtime TypeInfo Extractor available...')
  checkTypeInfoAnalyzeAvailable()

  // 7. send mod list to language server
  console.log('sending external mods...')
  await sendMods()

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
  const context = container.resolve('ExtensionContext') as ExtensionContext
  const serverModuleRelativePath = container.resolve(containerVars.languageServerModuleRelativePathKey) as string
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
