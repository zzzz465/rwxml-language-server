import {
	createConnection,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	PublishDiagnosticsParams,
	Location
} from 'vscode-languageserver'


import './parser/XMLParser'
import './testData/output.json'
import { ConfigDatum, ConfigChangedRequestType } from '../common/config'
import { objToTypeInfos, TypeInfoMap } from '../common/TypeInfo'
import { NodeValidator } from './features/NodeValidator'
import { builtInValidationParticipant } from './features/BuiltInValidator'
import { Node, XMLDocument } from './parser/XMLParser'
import { AsEnumerable } from 'linq-es2015'
import { CustomTextDocuments } from './RW/CustomDocuments'
import { DirtyNode, DefDatabase, isReferencedDef, isWeakRefNode } from './RW/DefDatabase'
import { Project, ProjectChangeEvent, ProjectEvent } from './RW/Project'
import { DocumentUri, TextDocument } from 'vscode-languageserver-textdocument'
import { DecoRequestRespond, DecoRequestType } from '../common/decoration'
import { decoration } from './features/Decoration'
import { DefDocument } from './RW/DefDocuments'
import { doHover } from './features/Hover'
import { doComplete } from './features/RWXMLCompletion'
import { TextureChangedNotificaionType, TextureRemovedNotificationType } from '../common/textures'
import { Event } from '../common/event'
import { File } from './RW/Folder'
import { URI } from 'vscode-uri'
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false

//#region connection & initial settings
connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities
	// _config = params.initializationOptions.config ?? defaultConfig // filePath: Uri 도 같이 있음
	// configfileUri = params.initializationOptions.filePath ?? null

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	)
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	)

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: ['<']
			},
			// definitionProvider: true,
			declarationProvider: true,
			referencesProvider: true,
			renameProvider: {
				prepareProvider: false,
			},
			hoverProvider: true,
			codeLensProvider: {
				resolveProvider: false // true
			}
			// typeDefinitionProvider: true,
		}
	}
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		}
	}
	return result
})

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined)
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.')
		})
	}

})
//#endregion

//#region global variables and Events
const customTextDocuments = new CustomTextDocuments()
customTextDocuments.listen(connection)

const projects = new Map<string, Project>() // version - Project
const typeInfoMaps = new Map<string, TypeInfoMap>() // version - injector
let config: ConfigDatum = { folders: {} }
const TextureAddEvent = new Event<File[]>()
const TextureDeleteEvent = new Event<File[]>()
//#endregion

//#region validate function implementation

function doValidate(project: Project, textDocument: TextDocument, XMLDocument: XMLDocument, defDB: DefDatabase) {
	const validator = new NodeValidator(
		project, textDocument, XMLDocument, [builtInValidationParticipant], defDB)
	return validator.validateNodes()
}

function ValidateDirtyNodes(dirtyNodes: DirtyNode[], project: Project): PublishDiagnosticsParams[] {
	const documents = AsEnumerable(dirtyNodes)
		.GroupBy(node => node.document.Uri)

	const result: PublishDiagnosticsParams[] = []

	for (const document of documents) {
		const documentUri = document.key || ''
		const XMLDoc = project.DefDocuments.GetDefDocument(documentUri)
		const TextDoc = customTextDocuments.GetDocument(documentUri)
		// ignore referenced def (TODO - add config to disable this config... really?)
		const isNotReferencedDef = !project.isReferenced(documentUri)
		if (XMLDoc && TextDoc && isNotReferencedDef) {
			const diagnostics = doValidate(project, TextDoc, XMLDoc, project.DefDB)
			result.push({ diagnostics, uri: documentUri })
		}
	}

	return result
}

//#endregion

// re-initialize everything when the config changes.
connection.onRequest(ConfigChangedRequestType, ({ configDatum, data }) => {
	// clear all old datas
	projects.forEach(proj => proj.dispose())
	projects.clear()
	typeInfoMaps.clear()
	TextureAddEvent.clear()
	TextureDeleteEvent.clear()

	// set config data
	config = configDatum

	// update all typeInfos
	for (const [version, props] of Object.entries(data)) {
		typeInfoMaps.set(version, new TypeInfoMap(objToTypeInfos(props.rawTypeInfo)))
	}

	// add Project if the typeinfoMap is generated
	for (const [version, config] of Object.entries(configDatum.folders)) {
		const targetTypeInfoMap = typeInfoMaps.get(version)
		// if the typeInfoMap is generated, else just ignore that version.
		if (targetTypeInfoMap) {
			const project = new Project(
				version, config, targetTypeInfoMap, customTextDocuments,
				TextureAddEvent, TextureDeleteEvent)

			project.Change.subscribe(onProjectChange, onProjectChange)

			projects.set(version, project)
		}
	}
})

function onProjectChange(event: ProjectEvent) {
	const result = ValidateDirtyNodes([...event.dirtyNodes.values()], event.project)
	if (event.type === 'change') {
		doValidate(event.project, event.textDocument, event.defDocument, event.project.DefDB)
	}
	result.map(d => connection.sendDiagnostics(d))
}

function GetDefDoc(uri: DocumentUri): XMLDocument | undefined {
	for (const proj of projects.values()) {
		const xmlDoc = proj.DefDocuments.GetDefDocument(uri)
		if (xmlDoc) return xmlDoc
	}
}

function GetProject(uri: DocumentUri): Project | undefined {
	for (const proj of projects.values()) {
		const xmlDoc = proj.DefDocuments.GetDefDocument(uri)
		if (xmlDoc)
			return proj
	}
}

function GetDefDocs(uri: DocumentUri): DefDocument[] {
	return [...projects.values()].map(p => p.DefDocuments.GetDefDocument(uri))
		.filter(d => !!d) as DefDocument[]
}

connection.onDeclaration(({ position, textDocument: { uri } }) => {
	const textDoc = customTextDocuments.GetDocument(uri)
	const xmlDoc = GetDefDoc(uri)
	if (textDoc && xmlDoc) {
		const offset = textDoc.offsetAt(position)
		const node = xmlDoc.findNodeAt(offset)
		if (isReferencedDef(node)) {
			const base = node.base
			const uri = base?.document.Uri
			if (uri && base) {
				const baseDoc = customTextDocuments.GetDocument(uri)
				if (baseDoc) {
					return {
						uri, range: {
							start: baseDoc.positionAt(base.start), end: baseDoc.positionAt(base.end)
						}
					} as Location
				}
			}
		}
	}
})


connection.onReferences(({ position, textDocument: { uri } }) => {
	const defDocs = GetDefDocs(uri)
	const textDoc = customTextDocuments.GetDocument(uri)
	const result: Location[] = []
	if (textDoc) {
		for (const defDoc of defDocs) {
			const node = defDoc.findNodeAt(textDoc.offsetAt(position))

			function AddLocations(nodes: Node[]): void {
				for (const node of nodes) {
					const textDoc = customTextDocuments.GetDocument(node.document.Uri)
					if (textDoc)
						result.push({
							range: { start: textDoc.positionAt(node.start), end: textDoc.positionAt(node.end) },
							uri: node.document.Uri
						})
				}
			}

			if (isWeakRefNode(node))
				AddLocations([...node.weakReference.in.values()])
			if (isReferencedDef(node))
				AddLocations([...node.derived.values()])
		}
	}

	return result
})

/*
// 레퍼런스로 연결된 textDocument 들은 수정하면 안됨!
connection.onRenameRequest(request => {
	console.log('onRenameRequest')
	return undefined

	const position = request.position
	const fsPath = URI.parse(request.textDocument.uri).fsPath
	const doc = defTextDocuments.getDocument(fsPath)
	const xmlDoc = defTextDocuments.getXMLDocument(fsPath)
	if (!doc || !xmlDoc) return undefined

	const node = xmlDoc.findNodeAt(doc.offsetAt(position))

	// node.
})
*/


connection.onCompletion(({ textDocument: { uri }, position }) => {
	const textDoc = customTextDocuments.GetDocument(uri)
	const defDoc = GetDefDoc(uri)
	const project = GetProject(uri)
	if (textDoc && defDoc && project)
		return doComplete({
			typeInfoMap: project.typeInfoMap,
			document: textDoc,
			position,
			xmlDocument: defDoc,
			defDatabase: project.DefDB
		})
})

connection.onCompletionResolve(handler => {
	return handler
})

connection.onRequest(DecoRequestType, ({ document: { uri } }) => {
	console.log('server: DecoRequest')
	const result: DecoRequestRespond = { document: { uri }, items: [] }

	for (const proj of projects.values()) {
		const textDocument = customTextDocuments.GetDocument(uri)
		const XMLDocument = proj.DefDocuments.GetDefDocument(uri)
		if (textDocument && XMLDocument) {
			result.items = decoration({ textDocument, XMLDocument })
		}
	}

	return result
})



connection.onHover(({ position, textDocument: { uri } }) => {
	const doc = customTextDocuments.GetDocument(uri)
	const defDoc = GetDefDoc(uri)

	if (doc && defDoc) {
		const offset = doc.offsetAt(position)
		return doHover({ document: doc, offset, xmlDocument: defDoc })
	}
})



connection.onCodeLens(({ textDocument }) => {
	/*
	const root = defTextDocuments.getXMLDocument(textDocument.uri)?.root
	const doc = defTextDocuments.getDocument(textDocument.uri)
	if (doc && root?.tag?.content == 'Defs') {
		const defs = root.children.filter(def => isDef(def) && def.closed)
		const results = defs.map(def => {
			const _in: typeNode[] = []
			const _out: typeNode[] = []
			if (isWeakRefNode(def)) {
				_in.push(...def.weakReference.in.values())
				_out.push(...def.weakReference.out.values())
			}

			if (isReferencedDef(def)) {
				_in.push(...def.derived.values())
				if (def.base)
					_out.push(def.base)
			}

			const result: CodeLens = {
				range: {
					start: doc.positionAt(def.start),
					end: def.startTagEnd ? doc.positionAt(def.startTagEnd) : doc.positionAt(def.start)
				},
				command: {
					title: `${_in.length} references`,

				} 
			}

			return result
		})
		return results
	}
	*/
	return undefined
})

connection.onNotification(TextureChangedNotificaionType, ({ uris }) => {
	const files = uris.map(uri => new File(URI.parse(uri)))
	TextureAddEvent.Invoke(files)
})

connection.onNotification(TextureRemovedNotificationType, ({ uris }) => {
	const files = uris.map(uri => new File(URI.parse(uri)))
	TextureDeleteEvent.Invoke(files)
})


// Listen on the connection
connection.listen()
