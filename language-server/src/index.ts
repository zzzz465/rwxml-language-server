import 'reflect-metadata'

import { createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver/node'
import { TextDocumentManager } from './textDocumentManager'
import { About } from './mod'
import { ProjectManager } from './projectManager'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEventManager } from './notificationEventManager'
import { LanguageFeature } from './features'
import { ModManager } from './mod/modManager'
import { DependencyRequester } from './dependencyRequester'
import { initializeLogger } from './logging'
import { File } from './fs'
import { URI } from 'vscode-uri'
import { container } from 'tsyringe'
import { TypeInfoMapManager } from './typeInfoMapManager'

initializeLogger()

const connection = createConnection(ProposedFeatures.all)

connection.onInitialize(async (params: InitializeParams) => {
  log.info('hello world! initializing @rwxml-language-server/language-server ...')

  container.register('connection', { useValue: connection })
  const about = container.resolve(About)
  const loadFolder = container.resolve(LoadFolder)
  const textDocumentManager = container.resolve(TextDocumentManager)
  const notificationEventManager = container.resolve(NotificationEventManager)
  const projectManager = container.resolve(ProjectManager)
  const languageFeature = container.resolve(LanguageFeature)
  const modManager = container.resolve(ModManager)
  const typeInfoMapManager = container.resolve(TypeInfoMapManager)

  loadFolder.listen(notificationEventManager.preEvent)
  textDocumentManager.listen(connection)
  notificationEventManager.listen(connection, textDocumentManager.event)
  projectManager.listen(notificationEventManager.event)
  languageFeature.listen(connection)
  modManager.listen(connection)
  about.listen(notificationEventManager.preEvent)

  const initializeResult: InitializeResult = {
    capabilities: {
      codeLensProvider: {},
      colorProvider: false,
      completionProvider: { resolveProvider: false, workDoneProgress: false, triggerCharacters: ['<', ' '] },
      declarationProvider: false, // 선언으로 바로가기
      definitionProvider: true, // 정의로 바로가기
      documentHighlightProvider: false,
      documentLinkProvider: undefined,
      hoverProvider: false,
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
