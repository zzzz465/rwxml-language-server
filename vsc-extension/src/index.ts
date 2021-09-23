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
import * as projectWatcher from './projectWatcher'

const disposables: Disposable[] = []

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

async function initialLoadFilesFromWorkspace() {
  const uris = await workspace.findFiles(projectWatcher.globPattern)

  const files = await Promise.all(
    uris.map(async (uri) => {
      const rawFile = await workspace.fs.readFile(uri)
      const text = Buffer.from(rawFile).toString()

      return { uri: uri.toString(), text }
    })
  )

  const client = container.resolve(LanguageClient)
  client.sendNotification(WorkspaceInitialization, { files })
}

export async function activate(context: ExtensionContext): Promise<void> {
  // 1. reset container && set extensionContext
  container.reset()

  container.register('ExtensionContext', { useValue: context })

  // 2. initialize containers (set values)
  disposables.push(containerVars.initialize())

  // 2-2. register commands
  disposables.push(...commands.initialize())

  // 2-3. modManager
  // 2-4. dependencyManager
  mods.initialize()

  // 3. wait language-server to be ready
  await initServer()

  // 4. initialize && wait Runtime TypeInfo Extractor
  checkTypeInfoAnalyzeAvailable()

  // 5. send mod list to language server
  await sendMods()

  // 6. add decorate update
  disposables.push(...features.registerFeatures())

  // 7. set project watcher
  projectWatcher.initialize()

  // 8. load all files from workspace, send files
  await initialLoadFilesFromWorkspace()
}

export function deactivate() {
  const client = container.resolve(LanguageClient)
  if (!client) {
    throw new Error('trying to deactivate extension, but it was never initialized.')
  }

  client.stop()
  disposables.map((disposable) => disposable.dispose())
}

async function initServer() {
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
