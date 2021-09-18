import { createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver/node'
import { TypeInfoMapManager } from './typeInfoMapManager'
import { TextDocumentManager } from './textDocumentManager'
import { About } from './mod'
import { ProjectManager } from './projectManager'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEventManager } from './notificationEventManager'
import { LanguageFeature } from './features'
import { ModManager } from './mod/modManager'
import { DependencyRequester } from './dependencyRequester'
import { initializeLogger } from './logging'

initializeLogger()

const connection = createConnection(ProposedFeatures.all)
const about = new About()
const loadFolder: LoadFolder = new LoadFolder()
const textDocumentManager = new TextDocumentManager()
const typeInfoMapManager = new TypeInfoMapManager()
const notificationEventManager = new NotificationEventManager()
const modManager = new ModManager()
const projectManager = new ProjectManager(about, loadFolder, modManager, typeInfoMapManager, textDocumentManager)
const languageFeature = new LanguageFeature(loadFolder, projectManager)
const dependencyRequester = new DependencyRequester(connection)

connection.onInitialize(async (params: InitializeParams) => {
  log.info('hello world! initializing @rwxml-language-server/language-server ...')

  loadFolder.listen(notificationEventManager.preEvent)
  textDocumentManager.listen(connection)
  notificationEventManager.listen(connection, textDocumentManager.event)
  projectManager.listen(notificationEventManager.event)
  languageFeature.listen(connection)
  modManager.listen(connection)
  about.listen(notificationEventManager.preEvent)
  dependencyRequester.listen(projectManager.event)

  // bind
  dependencyRequester.event.on('dependencyModsResponse', (files) => projectManager.onDependencyModsResponse(files))

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
