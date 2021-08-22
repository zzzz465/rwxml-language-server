import { DefDatabase, Metadata, NameDatabase, TypeInfoInjector, TypeInfoMap } from '@rwxml/analyzer'
import {
  createConnection,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocuments,
} from 'vscode-languageserver/node'
import { DefManager } from './defManager'
import {
  ProjectFileAdded,
  ProjectFileChanged,
  ProjectFileDeleted,
  SerializedXMLDocumentRequest,
  SerializedXMLDocumentResponse,
  WorkspaceInitialization,
  XMLDocumentDecoItemRequest,
} from './fs'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { getVersion } from './utils'
import { File } from './fs'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { Project } from './project'
import { URI } from 'vscode-uri'
import { RangeConverter } from './utils/rangeConverter'
import { onDecorate } from './features/decorate'
import { onDefinition } from './features/definition'
import { TextDocumentManager } from './textDocumentManager'

const connection = createConnection(ProposedFeatures.all)

const projects: Map<string, Project> = new Map()

let typeInfoMapManager: TypeInfoMapManager
const textDocuments = new TextDocuments(TextDocument)
const textDocumentManager = new TextDocumentManager()

const typeInfoMaps: Map<RimWorldVersion, TypeInfoMap> = new Map()

async function getTypeInfoMap(version: RimWorldVersion) {
  if (!typeInfoMaps.has(version)) {
    const typeInfoMap = await typeInfoMapManager.getTypeInfoMap(version)
    typeInfoMaps.set(version, typeInfoMap)
  }

  return typeInfoMaps.get(version) as TypeInfoMap
}

async function getProject(version: RimWorldVersion) {
  if (!projects.has(version)) {
    const defDatabase = new DefDatabase()
    const nameDatabase = new NameDatabase()
    const typeInfoMap = await getTypeInfoMap(version)
    const typeInfoInjector = new TypeInfoInjector(typeInfoMap)
    const defManager = new DefManager(defDatabase, nameDatabase, typeInfoMap, typeInfoInjector)

    projects.set(
      version,
      new Project(
        version,
        defManager,
        defDatabase,
        nameDatabase,
        new RangeConverter(textDocumentManager),
        textDocumentManager
      )
    )
  }

  const targetProject = projects.get(version) as Project

  return targetProject
}

connection.onInitialize(async (params: InitializeParams) => {
  connection.console.log('hello world! initializing @rwxml-language-server/language-server ...')

  typeInfoMapManager = new TypeInfoMapManager()

  connection.console.log('register notification handlers...')
  connection.onNotification(ProjectFileAdded, async (params) => {
    console.log(`ProjectFileAdded, uri: ${decodeURIComponent(params.uri)}`)
    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: URI.parse(params.uri), text: params.text, readonly: params.readonly })
    project.FileAdded(file)
  })

  connection.onNotification(ProjectFileChanged, async (params) => {
    console.log(`ProjectFileChanged, uri: ${decodeURIComponent(params.uri)}`)
    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: URI.parse(params.uri), text: params.text, readonly: params.readonly })
    project.FileChanged(file)
  })

  connection.onNotification(ProjectFileDeleted, async (params) => {
    console.log(`ProjectFileDeleted, uri: ${params.uri}`)
    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: URI.parse(params.uri) })
    project.FileDeleted(file)
  })

  /*
  textDocuments.onDidChangeContent(async (e) => {
    const uri = e.document.uri
    console.log(`onDidChangeContext, uri: ${decodeURIComponent(uri)}`)
    const version = getVersion(uri)
    const project = await getProject(version)
    const file = File.create({ uri: URI.parse(uri), text: e.document.getText() })
    project.FileChanged(file)
  })
  */

  connection.onNotification(WorkspaceInitialization, async ({ files }) => {
    for (const { uri, text, readonly } of files) {
      const version = getVersion(uri)
      const project = await getProject(version)
      const file = File.create({ uri: URI.parse(uri), text, readonly })
      project.FileAdded(file)
    }
  })

  connection.onRequest(SerializedXMLDocumentRequest, async ({ uri }) => {
    console.log(`SerializedXMLDocumentRequest: ${uri}`)
    const version = getVersion(uri)
    const project = await getProject(version)

    const xmlDocument = project.getXMLDocumentByUri(uri)

    return {
      document: xmlDocument,
    } as SerializedXMLDocumentResponse
  })

  connection.onCodeLens((params) => {
    return []
  })

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

  textDocuments.listen(connection)

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
