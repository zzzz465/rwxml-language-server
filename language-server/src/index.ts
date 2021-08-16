import axios from 'axios'
import { DefDatabase, Metadata, NameDatabase, TypeInfoInjector, TypeInfoMap } from 'rwxml-analyzer'
import {
  createConnection,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocuments,
} from 'vscode-languageserver/node'
import { DefManager } from './defManager'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './fs'
import { Project } from './project'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { getVersion } from './utils'
import { File } from './fs'
import { TextDocument } from 'vscode-languageserver-textdocument'

const connection = createConnection(ProposedFeatures.all)

const projects: Map<string, Project> = new Map()
const metadataURL = 'https://raw.githubusercontent.com/zzzz465/rwxml-language-server/release/metadata/metadata.yaml'

let metadata: Metadata
let typeInfoMapManager: TypeInfoMapManager
const textDocuments = new TextDocuments(TextDocument)

const typeInfoMaps: Map<RimWorldVersion, TypeInfoMap> = new Map()

async function getTypeInfoMap(version: RimWorldVersion) {
  if (!typeInfoMaps.has(version)) {
    const typeInfoMap = await typeInfoMapManager.getTypeInfoMap(version)
    typeInfoMaps.set(version, typeInfoMap)
  }

  return typeInfoMaps.get(version) as TypeInfoMap
}

async function getProject(version: RimWorldVersion) {
  if (projects.has(version)) {
    const defDatabase = new DefDatabase()
    const nameDatabase = new NameDatabase()
    const typeInfoMap = await getTypeInfoMap(version)
    const typeInfoInjector = new TypeInfoInjector(typeInfoMap)
    const defManager = new DefManager(defDatabase, nameDatabase, typeInfoMap, typeInfoInjector)

    projects.set(version, new Project(version, defManager, defDatabase, nameDatabase))
  }

  return projects.get(version) as Project
}

connection.onInitialize(async (params: InitializeParams) => {
  const res = await axios.get(metadataURL)

  if (res.status === 200) {
    metadata = res.data as Metadata
  } else {
    throw new Error(`cannot get metadata from url ${metadataURL}`)
  }

  typeInfoMapManager = new TypeInfoMapManager(metadata)

  connection.onNotification(ProjectFileAdded, async (params) => {
    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri, text: params.text })
    project.FileAdded(file)
  })

  connection.onNotification(ProjectFileChanged, async (params) => {
    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri, text: params.text })
    project.FileChanged(file)
  })

  connection.onNotification(ProjectFileDeleted, async (params) => {
    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri })
    project.FileDeleted(file)
  })

  textDocuments.onDidChangeContent(async (e) => {
    const version = getVersion(e.document.uri)
    const project = await getProject(version)
    const file = File.create({ uri: e.document.uri, text: e.document.getText() })
    project.FileChanged(file)
  })

  textDocuments.listen(connection)

  const initializeResult: InitializeResult = {
    capabilities: {
      codeLensProvider: { resolveProvider: false },
      colorProvider: false,
      completionProvider: {},
      declarationProvider: false,
      definitionProvider: false,
      documentHighlightProvider: false,
      documentLinkProvider: undefined,
      hoverProvider: false,
      referencesProvider: false,
      typeDefinitionProvider: false,
    },
  }

  return initializeResult
})

connection.onInitialized(async (params) => {
  console.log('language-server initialized.')
})
