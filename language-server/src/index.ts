import 'reflect-metadata'

import { createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver/node'
import { TextDocumentManager } from './textDocumentManager'
import { About } from './mod'
import { ProjectManager } from './projectManager'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEventManager } from './notificationEventManager'
import * as features from './features'
import { container } from 'tsyringe'
import { ConnectionToken } from './connection'
import { ModManager } from './mod/modManager'
import { DependencyResourceManager } from './dependencyResourceManager'
import { FileStore } from './fileStore'
import { TextDocumentsAdapter } from './textDocumentsAdapter'
import * as logs from './log'
import * as winston from 'winston'

const connection = createConnection(ProposedFeatures.all)
container.register(ConnectionToken, { useValue: connection })

connection.onInitialize(async (params: InitializeParams) => {
  const logLevel = params.initializationOptions?.logs?.level
  logs.initializeLogger(logLevel)

  const log = container.resolve<winston.Logger>(logs.LogToken)

  log.info('hello world! initializing @rwxml-language-server/language-server ...')

  // TODO: replace this initalize codes to use token registry

  const about = container.resolve(About)
  const loadFolder = container.resolve(LoadFolder)
  const textDocumentManager = container.resolve(TextDocumentManager)
  const notificationEventManager = container.resolve(NotificationEventManager)
  const projectManager = container.resolve(ProjectManager)
  const languageFeature = container.resolve(features.LanguageFeature)
  const modManager = container.resolve(ModManager)
  const dependencyResourceManager = container.resolve(DependencyResourceManager)
  const fileStore = container.resolve(FileStore)
  const textDocumentsAdapter = container.resolve(TextDocumentsAdapter)

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

  const initializeResult: InitializeResult = {
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

connection.listen()
