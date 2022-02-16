/* eslint-disable quotes */
/* eslint-disable @typescript-eslint/no-empty-function */
import { Disposable, env, ExtensionContext, FileSystemWatcher, Uri, workspace } from 'vscode'
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient'
import { printXMLDocumentObjectHandler } from './commands'
import * as path from 'path'
import vscode from 'vscode'
import { registerFeatures, updateDecoration } from './features'
import {
  ModChangedNotificationParams,
  ProjectFileAdded,
  ProjectFileChanged,
  ProjectFileDeleted,
  WorkspaceInitialization,
} from './events'
import { ModManager } from './mod/modManager'
import { getCoreDirectoryUri, getLocalModDirectoryUri, getWorkshopModsDirectoryUri, SerializedAbout } from './mod'
import { DependencyManager } from './dependencyManager'

let client: LanguageClient
let disposed = false
let fileSystemWatcher: FileSystemWatcher
let modManager: ModManager
let dependencyManager: DependencyManager
const disposables: Disposable[] = []

async function sendMods(client: LanguageClient, modManager: ModManager) {
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

const watchedExts = ['xml', 'wav', 'mp3', 'bmp', 'jpeg', 'jpg', 'png']
const globPattern = `**/*.{${watchedExts.join(',')}}`

async function suggestMainBuild(context: ExtensionContext) {
  const suggestionKey = 'suggestion'
  const ignored = context.globalState.get(suggestionKey)
  if (ignored) {
    return
  }

  const search = 'rwxml'
  const insiderId = 'madeline.rwxml-language-server-insider'
  const id = 'madeline.rwxml-lang-serv'

  const response = await vscode.window.showInformationMessage(
    'RWXML: insider version is deprecated.',
    {
      detail: [
        'RWXML insider version is now merged to main branch. (>= 0.13.0)',
        'insider users are suggested to move to the main version.',
      ].join('\n'),
      modal: true,
    },
    'Open Extension Page',
    'Install',
    "Don't show it again"
  )

  if (response === 'Open Extension Page') {
    await vscode.commands.executeCommand('workbench.extensions.search', search)
    await vscode.commands.executeCommand('extension.open', id)
  } else if (response === 'Install') {
    await vscode.commands.executeCommand('workbench.extensions.search', search)
    await vscode.commands.executeCommand('extension.open', id)
    await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', insiderId)
    await vscode.commands.executeCommand('workbench.extensions.installExtension', id)
    console.log('current extension id: ', context.extension.id)
    // await vscode.commands.executeCommand('')
  } else if (response === "Don't show it again") {
    context.globalState.update(suggestionKey, true)
  } else {
    // user canceled(X) info notification.
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  suggestMainBuild(context)

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

async function initServer(modulePath: string) {
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
