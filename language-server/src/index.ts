import {
  CompletionList,
  createConnection,
  InitializeParams,
  InitializeResult,
  LocationLink,
  ProposedFeatures,
} from 'vscode-languageserver/node'
import { TypeInfoMapManager } from './typeInfoMapManager'
import { TextDocumentManager } from './textDocumentManager'
import { About } from './mod'
import { ProjectManager } from './projectManager'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEventManager } from './notificationEventManager'
import { XMLDocumentDecoItemRequest, XMLDocumentDecoItemResponse } from './fs'
import { URI } from 'vscode-uri'
import { onDecorate } from './features/decorate'
import { onDefinition } from './features/definition'
import { codeCompletion } from './features'

const connection = createConnection(ProposedFeatures.all)
const about = new About()
const loadFolder: LoadFolder = new LoadFolder()
const textDocumentManager = new TextDocumentManager()
const typeInfoMapManager = new TypeInfoMapManager()
const notificationEventManager = new NotificationEventManager()
const projectManager = new ProjectManager(about, loadFolder, typeInfoMapManager, textDocumentManager)

connection.onInitialize(async (params: InitializeParams) => {
  connection.console.log('hello world! initializing @rwxml-language-server/language-server ...')

  loadFolder.listen(notificationEventManager.preEvent)
  textDocumentManager.listen(connection)
  notificationEventManager.listen(connection, textDocumentManager.event)
  projectManager.listen(notificationEventManager.event)

  connection.console.log('register features...')
  connection.onCodeLens((params) => {
    return []
  })

  connection.onRequest(XMLDocumentDecoItemRequest, async ({ uri: uriString }) => {
    const uri = URI.parse(uriString)
    const versions = loadFolder.isBelongsTo(uri)
    const result: XMLDocumentDecoItemResponse = { uri: uriString, items: [] }

    for (const version of versions) {
      const project = await projectManager.getProject(version)
      const { decoItems, errors } = onDecorate(project, uri)

      if (errors.length > 0) {
        console.log(errors)
      }

      result.items.push(...decoItems)
    }

    return result
  })

  connection.onDefinition(async ({ position, textDocument }) => {
    const uri = URI.parse(textDocument.uri)
    const versions = loadFolder.isBelongsTo(uri)
    const result: LocationLink[] = []

    for (const version of versions) {
      const project = await projectManager.getProject(version)
      const { definitionLinks, errors } = onDefinition(project, uri, position)

      if (errors.length > 0) {
        console.log(errors)
      }

      result.push(...definitionLinks)
    }

    return result
  })

  connection.onCompletion(async ({ position, textDocument }) => {
    const uri = URI.parse(textDocument.uri)
    const versions = loadFolder.isBelongsTo(uri)
    const result: CompletionList = { isIncomplete: true, items: [] }

    for (const version of versions) {
      const project = await projectManager.getProject(version)
      const { isIncomplete, items } = codeCompletion(project, uri, position)

      result.isIncomplete ||= isIncomplete
      result.items.push(...items)
    }

    return result
  })

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
