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
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { getVersion } from './utils'
import { File } from './fs'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { Project } from './project'
import YAML from 'js-yaml'

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
  if (!projects.has(version)) {
    const defDatabase = new DefDatabase()
    const nameDatabase = new NameDatabase()
    const typeInfoMap = await getTypeInfoMap(version)
    const typeInfoInjector = new TypeInfoInjector(typeInfoMap)
    const defManager = new DefManager(defDatabase, nameDatabase, typeInfoMap, typeInfoInjector)

    projects.set(version, new Project(version, defManager, defDatabase, nameDatabase))
  }

  const targetProject = projects.get(version) as Project

  return targetProject
}

connection.onInitialize(async (params: InitializeParams) => {
  connection.console.log('hello world! initializing @rwxml-language-server/language-server ...')
  connection.console.log('receiving metadata from web...')
  const res = await axios.get(metadataURL)

  if (res.status === 200) {
    console.log('received metadata.')
    console.log(res.data)
    metadata = YAML.load(res.data) as Metadata
    console.log('metadata parsed as json.')
    console.log(JSON.stringify(metadata, undefined, 4))

    connection.console.log('ok!')
  } else {
    throw new Error(`cannot get metadata from url ${metadataURL}`)
  }

  typeInfoMapManager = new TypeInfoMapManager(metadata)

  connection.console.log('register notification handlers...')
  connection.onNotification(ProjectFileAdded, async (params) => {
    console.log(`ProjectFileAdded, uri: ${params.uri}`)

    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri, text: params.text })
    project.FileAdded(file)
  })

  connection.onNotification(ProjectFileChanged, async (params) => {
    console.log(`ProjectFileChanged, uri: ${params.uri}`)
    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri, text: params.text })
    project.FileChanged(file)
  })

  connection.onNotification(ProjectFileDeleted, async (params) => {
    console.log(`ProjectFileDeleted, uri: ${params.uri}`)
    if (textDocuments.get(params.uri)) {
      return
    }

    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri })
    project.FileDeleted(file)
  })

  textDocuments.onDidChangeContent(async (e) => {
    const uri = decodeURIComponent(e.document.uri)
    console.log(`onDidChangeContext, uri: ${uri}`)
    const version = getVersion(uri)
    const project = await getProject(version)
    const file = File.create({ uri, text: e.document.getText() })
    project.FileChanged(file)
  })

  textDocuments.listen(connection)

  const initializeResult: InitializeResult = {
    capabilities: {
      codeLensProvider: { resolveProvider: false },
      colorProvider: false,
      completionProvider: {},
      declarationProvider: true,
      definitionProvider: true,
      documentHighlightProvider: false,
      documentLinkProvider: undefined,
      hoverProvider: false,
      referencesProvider: false,
      typeDefinitionProvider: false,
      workspace: {
        workspaceFolders: {
          supported: true,
        },
      },
    },
  }

  connection.console.log('initialization completed!')

  return initializeResult
})

connection.onInitialized((params) => {
  connection.console.log('onInitialized')
})

connection.listen()
