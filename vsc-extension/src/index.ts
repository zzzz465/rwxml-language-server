/* eslint-disable @typescript-eslint/no-empty-function */
import 'reflect-metadata'
import { Disposable, env, ExtensionContext, FileSystemWatcher, Uri, workspace } from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient'
import * as path from 'path'
import vscode from 'vscode'
import { container } from 'tsyringe'
import * as features from './features'
import {
  ModChangedNotificationParams,
  ProjectFileAdded,
  ProjectFileChanged,
  ProjectFileDeleted,
  WorkspaceInitialization,
} from './events'
import { ModManager } from './mod/modManager'
import { getCoreDirectoryUri, getLocalModDirectoryUri, getWorkshopModsDirectoryUri, SerializedAbout } from './mod'
import { DependencyManager } from './mod/dependencyManager'
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
    about: SerializedAbout
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
  const uris = await vscode.workspace.findFiles(projectWatcher.globPattern)

  const files = await Promise.all(
    uris.map(async (uri) => {
      const rawFile = await vscode.workspace.fs.readFile(uri)
      const text = Buffer.from(rawFile).toString()

      return { uri: uri.toString(), text }
    })
  )

  const client = container.resolve(LanguageClient)
  client.sendNotification(WorkspaceInitialization, { files })
}

const watchedExts = ['xml', 'wav', 'mp3', 'bmp', 'jpeg', 'jpg', 'png']
const globPattern = `**/*.{${watchedExts.join(',')}}`

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
  const client = await initServer()

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

  // initalize language server
  console.log('initializing @rwxml-language-server/vsc-extension ...')
  const languageServerEntryPath = process.env.languageServerEntryPath
  if (!languageServerEntryPath) {
    throw new Error('env.languageServerEntryPath is invalid.')
  }
  const languageServerModulePath = path.join(context.extensionPath, languageServerEntryPath)
  console.log(`languageServerModulePath: ${languageServerModulePath}`)
  client = await initServer(languageServerModulePath)

  // register commands
  console.log('register commands...')
  context.subscriptions.push(...registerFeatures())

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

  console.log('initializing modManager...')
  const coreDirectoryUri = getCoreDirectoryUri()
  const workshopModDirectoryUri = getWorkshopModsDirectoryUri()
  const localModDirectoryUri = getLocalModDirectoryUri()
  console.log(`core directory: ${decodeURIComponent(coreDirectoryUri.toString())}`)
  console.log(`workshop Directory: ${decodeURIComponent(workshopModDirectoryUri.toString())}`)
  console.log(`local mod directory: ${decodeURIComponent(localModDirectoryUri.toString())}`)

  modManager = new ModManager([coreDirectoryUri, workshopModDirectoryUri, localModDirectoryUri])
  await modManager.init()
  console.log('initializing modManager completed.')

  console.log('initializing dependencyManager...')
  dependencyManager = new DependencyManager(modManager)
  dependencyManager.listen(client)
  console.log('dependencyManager initialized.')

  // wait server to be ready
  console.log('waiting language-server to be ready...')
  client.start()
  await client.onReady()
  console.log('language-server is ready.')

  console.log('initializing Runtime TypeInfo Extractor...')
  checkTypeInfoAnalyzeAvailable()

  console.log('sending mod list to language server...')
  await sendMods(client, modManager)

  console.log('register decorate update hooks...')

  function callUpdateDecoration(timeout_ms: number) {
    return function () {
      const uri = vscode.window.activeTextEditor?.document.uri
      if (uri) {
        updateDecoration(client, uri.toString(), timeout_ms)
      }
    }
  }

  // interval hook
  setInterval(callUpdateDecoration(500), 500)
  vscode.window.onDidChangeActiveTextEditor(callUpdateDecoration(50), undefined, disposables)
  vscode.window.onDidChangeVisibleTextEditors(callUpdateDecoration(50), undefined, disposables)

  console.log('registering decorate update interval callback done.')

  console.log('initializing project Watcher...')
  fileSystemWatcher = workspace.createFileSystemWatcher(globPattern)
  fileSystemWatcher.onDidCreate(async (uri) => {
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString()
    client.sendNotification(ProjectFileAdded, { uri: uri.toString(), text })
  })
  fileSystemWatcher.onDidChange(async (uri) => {
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString()
    client.sendNotification(ProjectFileChanged, { uri: uri.toString(), text })
  })
  fileSystemWatcher.onDidDelete(async (uri) => {
    client.sendNotification(ProjectFileDeleted, { uri: uri.toString() })
  })
  disposables.push(fileSystemWatcher)
  console.log('project Watcher initialized.')

  console.log('loading all files from current workspace...')
  const xmlFiles = await vscode.workspace.findFiles(globPattern)
  console.log(`${xmlFiles.length} xml files found in current workspace. reading...`)
  const loadedXMLFiles = await Promise.all(
    xmlFiles.map(async (uri) => {
      const rawFile = await vscode.workspace.fs.readFile(uri)
      const text = Buffer.from(rawFile).toString()

      return { uri: uri.toString(), text }
    })
  )
  console.log(`loaded ${loadedXMLFiles.length} files...`)
  console.log('sending WorkspaceInitialization notification...')
  await client.sendNotification(WorkspaceInitialization, {
    files: loadedXMLFiles,
  })

  console.log('loading current workspace xml files completed.')

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
  const context = container.resolve('ExtensionContext') as ExtensionContext
  const serverModuleRelativePath = container.resolve(containerVars.languageServerEntryPathKey) as string
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
