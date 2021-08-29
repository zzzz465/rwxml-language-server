import { createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver/node'
import { TypeInfoMapManager } from './typeInfoMapManager'
import { TextDocumentManager } from './textDocumentManager'
import { About } from './mod'
import { ProjectManager } from './projectManager'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEventManager } from './notificationEventManager'

const connection = createConnection(ProposedFeatures.all)
const about = new About()
const loadFolder: LoadFolder = new LoadFolder()
const textDocumentManager = new TextDocumentManager()
const typeInfoMapManager = new TypeInfoMapManager()
const notificationEventManager = new NotificationEventManager()
const projectManager = new ProjectManager(about, loadFolder, typeInfoMapManager, textDocumentManager)

connection.onInitialize(async (params: InitializeParams) => {
  connection.console.log('hello world! initializing @rwxml-language-server/language-server ...')

  textDocumentManager.listen(connection)
  notificationEventManager.listen(connection, textDocumentManager.event)
  projectManager.listen(notificationEventManager.event)

  connection.console.log('register features...')
  connection.onCodeLens((params) => {
    return []
  })

  /*
  connection.onRequest(XMLDocumentDecoItemRequest, async ({ uri }) => {
    const version = getVersion(uri)
    const project = await getProject(version)

    if (project) {
      const { decoItems, errors } = onDecorate(project, URI.parse(uri))

      if (errors.length > 0) {
        console.log(errors)
      }

      return { uri, items: decoItems }
    } else {
      return []
    }
  })
  */

  /*
  connection.onDefinition(async ({ position, textDocument }) => {
    const version = getVersion(textDocument.uri)
    const project = await getProject(version)

    if (project) {
      const { definitionLinks, errors } = onDefinition(project, URI.parse(textDocument.uri), position)

      if (errors.length > 0) {
        console.log(errors)
      }

      return definitionLinks
    }

    return []
  })
  */

  /*
  connection.onCompletion(async ({ position, textDocument }) => {
    const version = getVersion(textDocument.uri)
    const project = await getProject(version)

    if (project) {
      const result = codeCompletion(project, URI.parse(textDocument.uri), position)

      return result
    }
  })
  */

  // completion vs completionResolve?
  // https://github.com/prabirshrestha/vim-lsp/issues/304#issuecomment-465895054
  // connection.onCompletionResolve((e) => {
  // return []
  // })

  const initializeResult: InitializeResult = {
    capabilities: {
      codeLensProvider: { resolveProvider: false },
      colorProvider: false,
      completionProvider: {},
      declarationProvider: false, // 선언으로 바로가기
      definitionProvider: true, // 정의로 바로가기
      documentHighlightProvider: false,
      documentLinkProvider: undefined,
      hoverProvider: false,
      referencesProvider: false,
      typeDefinitionProvider: false,
      workspace: {
        workspaceFolders: {
          supported: false,
        },
      },
    },
  }

  connection.console.log('initialization completed!')

  return initializeResult
})

connection.listen()
