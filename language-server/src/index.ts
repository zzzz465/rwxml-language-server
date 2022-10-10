import 'reflect-metadata'
import { install } from 'source-map-support'
import { container } from 'tsyringe'
import * as ls from 'vscode-languageserver/node'
import { Configuration } from './configuration'
import { ConnectionToken } from './connection'
import * as features from './features'
import { FileStore } from './fileStore'
import { InitRegistry } from './initRegistry'
import defaultLogger, { LogManager } from './log'
import { About } from './mod'
import { LoadFolder } from './mod/loadfolders'
import { ModManager } from './mod/modManager'
import { NotificationEventManager } from './notificationEventManager'
import { ProjectManager } from './projectManager'
import { TextDocumentManager } from './textDocumentManager'

install()

process.on('uncaughtException', (err) => {
  console.error(`uncaughtException: ${err}`)
})

const connection = ls.createConnection(ls.ProposedFeatures.all)
container.register(ConnectionToken, { useValue: connection })

connection.onInitialize(async (params: ls.InitializeParams) => {
  const logLevel = params.initializationOptions?.logs?.level

  const configuration = container.resolve(Configuration)
  configuration.init(connection)

  const logManager = container.resolve(LogManager)
  await logManager.init(logLevel)

  const log = defaultLogger()

  log.info('hello world! initializing @rwxml-language-server/server ...')

  InitRegistry.init()

  const about = container.resolve(About)
  const loadFolder = container.resolve(LoadFolder)
  const textDocumentManager = container.resolve(TextDocumentManager)
  const notificationEventManager = container.resolve(NotificationEventManager)
  const projectManager = container.resolve(ProjectManager)
  const languageFeature = container.resolve(features.LanguageFeature)
  const modManager = container.resolve(ModManager)
  const fileStore = container.resolve(FileStore)

  notificationEventManager.listen(fileStore.event)
  loadFolder.listen(notificationEventManager.preEvent)
  textDocumentManager.listen(notificationEventManager.preEvent)
  projectManager.listen(notificationEventManager.event)
  languageFeature.listen(connection)
  modManager.listen(connection)
  about.listen(notificationEventManager.preEvent)

  features.ProviderRegistry.listenAll(connection)

  const initializeResult: ls.InitializeResult = {
    capabilities: {
      codeLensProvider: {},
      colorProvider: false,
      completionProvider: { resolveProvider: false, workDoneProgress: false, triggerCharacters: ['<', ' '] },
      declarationProvider: false, // 선언으로 바로가기
      definitionProvider: true, // 정의로 바로가기
      documentHighlightProvider: false,
      documentLinkProvider: undefined,
      hoverProvider: true,
      referencesProvider: true,
      typeDefinitionProvider: false,
      workspace: {
        workspaceFolders: {
          supported: false,
        },
      },
      renameProvider: false,
    },
  }

  log.info('initialization completed!')

  return initializeResult
})

connection.onInitialized(() => {
  connection.client.register(ls.DidChangeConfigurationNotification.type, undefined)
})

connection.listen()
