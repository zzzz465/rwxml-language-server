import axios from 'axios'
import { DefDatabase, Metadata, NameDatabase, TypeInfoInjector, TypeInfoMap } from 'rwxml-analyzer'
import { createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver/node'
import { DefManager } from './defManager'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './fs'
import { Project } from './project'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { getVersion } from './utils'
import { File } from './fs'

const connection = createConnection(ProposedFeatures.all)

connection.onInitialize((params: InitializeParams) => {
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

const projects: Map<string, Project> = new Map()
const metadataURL = 'https://raw.githubusercontent.com/zzzz465/rwxml-language-server/release/metadata/metadata.yaml'

let metadata: Metadata
let typeInfoMapManager: TypeInfoMapManager

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

connection.onInitialized(async (params) => {
  const res = await axios.get(metadataURL)

  if (res.status === 200) {
    metadata = res.data as Metadata
  } else {
    throw new Error(`cannot get metadata from url ${metadataURL}`)
  }

  typeInfoMapManager = new TypeInfoMapManager(metadata)

  connection.onNotification(ProjectFileAdded, async (params) => {
    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri, text: params.text })
    project.FileAdded(file)
  })

  connection.onNotification(ProjectFileChanged, async (params) => {
    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri, text: params.text })
    project.FileChanged(file)
  })

  connection.onNotification(ProjectFileDeleted, async (params) => {
    const version = getVersion(params.uri)
    const project = await getProject(version)
    const file = File.create({ uri: params.uri })
    project.FileDeleted(file)
  })
})
