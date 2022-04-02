import 'reflect-metadata'

import * as ls from 'vscode-languageserver/node'
import { TextDocumentManager } from './textDocumentManager'
import { About } from './mod'
import { ProjectManager } from './projectManager'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEventManager } from './notificationEventManager'
import * as features from './features'
import { container } from 'tsyringe'
import { ConnectionToken } from './connection'
import { ModManager } from './mod/modManager'
import { ModDependencyResourceStore } from './dependencyResourceStore'
import { FileStore } from './fileStore'
import { TextDocumentsAdapter } from './textDocumentsAdapter'
import * as logs from './log'
import * as winston from 'winston'
import { Configuration } from './configuration'
import { InitRegistry } from './initRegistry'

const connection = ls.createConnection(ls.ProposedFeatures.all)
container.register(ConnectionToken, { useValue: connection })

connection.onInitialize(async (params: ls.InitializeParams) => {
  const logLevel = params.initializationOptions?.logs?.level
  console.log(`current log level: ${logLevel}`)

  logs.initializeLogger(logLevel)

  const log = container.resolve<winston.Logger>(logs.LogToken)

  log.info('hello world! initializing @rwxml-language-server/language-server ...')

  InitRegistry.init()

  const configuration = container.resolve(Configuration)
  const about = container.resolve(About)
  const loadFolder = container.resolve(LoadFolder)
  const textDocumentManager = container.resolve(TextDocumentManager)
  const notificationEventManager = container.resolve(NotificationEventManager)
  const projectManager = container.resolve(ProjectManager)
  const languageFeature = container.resolve(features.LanguageFeature)
  const modManager = container.resolve(ModManager)
  const dependencyResourceManager = container.resolve(ModDependencyResourceStore)
  const fileStore = container.resolve(FileStore)
  const textDocumentsAdapter = container.resolve(TextDocumentsAdapter)

  configuration.init(connection)
  notificationEventManager.listen(textDocumentsAdapter.event)
  notificationEventManager.listen(dependencyResourceManager.event)
  loadFolder.listen(notificationEventManager.preEvent)
  notificationEventManager.listenConnection(connection)
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
      renameProvider: true,
    },
  }

  log.info('initialization completed!')

  return initializeResult
})

connection.onInitialized(() => {
  connection.client.register(ls.DidChangeConfigurationNotification.type, undefined)
})

connection.listen()
