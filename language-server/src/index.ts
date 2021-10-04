import 'reflect-metadata'

import { initializeLogger } from './logging'
initializeLogger()

import { createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver/node'
import { TextDocumentManager } from './textDocumentManager'
import { About } from './mod'
import { ProjectManager } from './projectManager'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEventManager } from './notificationEventManager'
import { LanguageFeature } from './features'
import { ModManager } from './mod/modManager'
import { container } from 'tsyringe'
import { ConnectionWrapper } from './connection'

const connection = createConnection(ProposedFeatures.all)
container.register('connection', { useValue: connection })
const connectionWrapper = container.resolve(ConnectionWrapper)

connection.onInitialize(async (params: InitializeParams) => {
  log.info('hello world! initializing @rwxml-language-server/language-server ...')

  const about = container.resolve(About)
  const loadFolder = container.resolve(LoadFolder)
  const textDocumentManager = container.resolve(TextDocumentManager)
  const notificationEventManager = container.resolve(NotificationEventManager)
  const projectManager = container.resolve(ProjectManager)
  const languageFeature = container.resolve(LanguageFeature)
  const modManager = container.resolve(ModManager)

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
