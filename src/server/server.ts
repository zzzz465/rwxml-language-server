/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	Location, CodeLens
} from 'vscode-languageserver';

import { URI } from 'vscode-uri'

import './parser/XMLParser'
import './testData/output.json'
import { doComplete } from './features/RWXMLCompletion'
import { ConfigDatum, ConfigChangedRequestType, getVersion } from '../common/config'
import { DefTextDocuments, isReferencedDef, isSourcedDef, DefTextDocument, DirtyNode, isWeakRefNode } from './RW/DefTextDocuments';
import { objToTypeInfos, TypeInfoMap, TypeInfoInjector, def, TypeInfo, isTypeNode, isDef, typeNode } from '../common/TypeInfo';
import { /* absPath */ URILike } from '../common/common';
import { NodeValidator } from './features/NodeValidator';
import { builtInValidationParticipant } from './features/BuiltInValidator';
import { versionDB } from './versionDB';
import { DecoRequestType, DecoRequestRespond, DecoType } from '../common/decoration';
import { BFS } from './utils/nodes';
import { TextureChangedNotificaionType, TextureRemovedNotificationType } from '../common/textures';
import { XMLDocument } from './parser/XMLParser';
import { decoration } from './features/Decoration';
import { doHover } from './features/Hover';
import { AsEnumerable } from 'linq-es2015';
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;


connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;
	// _config = params.initializationOptions.config ?? defaultConfig // filePath: Uri 도 같이 있음
	// configfileUri = params.initializationOptions.filePath ?? null

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

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
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}

});

// const mockDataPath = path.join(__dirname, './testData/output.json') // for development only
// const mockTypeData: any[] = JSON.parse(fs.readFileSync(mockDataPath, { encoding: 'utf-8' }))
// const typeInfos = objToTypeInfos(mockTypeData)

let versionDB: Map<string, versionDB> = new Map()
let config: ConfigDatum = { folders: {} }

const defTextDocuments = new DefTextDocuments()
defTextDocuments.getVersionDB = (version) => versionDB.get(version)

defTextDocuments.getVersion = (uri) => getVersion(config, uri)?.version

/** version - URILike, 파일이 있는지 없는지 체크하기 위함 */
const files: Map<string, Set<URILike>> = new Map()

// re-initialize everything when the config changes.
connection.onRequest(ConfigChangedRequestType, ({ configDatum, data }) => {
	console.log('server: received config changed event')
	config = configDatum
	versionDB = new Map() // FIXME - delete this
	for (const [version, props] of Object.entries(data)) {
		const map = new TypeInfoMap(objToTypeInfos(props.rawTypeInfo))
		versionDB.set(version, {
			injector: new TypeInfoInjector(map),
			typeInfoMap: map,
			textureFileSet: new Set() // we'll receive texture paths in incoming events after this event.
		})
	}
	defTextDocuments.clear()
})

connection.onNotification(TextureChangedNotificaionType, ({ files, version }) => {
	const db = versionDB.get(version)
	if (!db) return

	for (const file of files) {
		if (db.textureFileSet.has(version)) {
			// textureFileChanged event
		} else {
			// textureFileAdded event
			db.textureFileSet.add(file)
		}
	}
})

connection.onNotification(TextureRemovedNotificationType, ({ files, version }) => {
	const db = versionDB.get(version)
	if (!db) return

	const deletedFiles: string[] = []
	for (const file of files) {
		const flag = db.textureFileSet.delete(file)
		if (flag)
			deletedFiles.push(file)
	}
	// textureRemoved event
})

connection.onDeclaration(request => {
	const uri = request.textDocument.uri
	const defs = defTextDocuments.getDefs(uri)
	const textDocument = defTextDocuments.getDocument(uri)
	if (textDocument) {
		let targetDef: def | undefined = undefined
		for (const def of defs) {
			const offset = textDocument.offsetAt(request.position)
			if (def.start < offset && offset < def.end) {
				targetDef = def
				break
			}
		}
		if (targetDef && isReferencedDef(targetDef)) {
			const base = targetDef.base
			if (base && isSourcedDef(base)) {
				const uri = URI.file(base.source)
				const baseDoc = defTextDocuments.getDocument(base.source)
				if (baseDoc) {
					return {
						uri: uri.toString(),
						range: {
							start: baseDoc.positionAt(base.start),
							end: baseDoc.positionAt(base.end)
						}
					}
				}
			}
		}
	}
})

connection.onReferences(request => {
	const uri = request.textDocument.uri
	const defs = defTextDocuments.getDefs(uri)
	const textDocument = defTextDocuments.getDocument(uri)
	if (textDocument) {
		let selectedDef: def | undefined
		for (const def of defs) {
			const offset = textDocument.offsetAt(request.position)
			if (def.start < offset && offset < def.end) {
				selectedDef = def
				break
			}
		}

		if (selectedDef && isReferencedDef(selectedDef)) {
			const result: Location[] = []
			for (const child of selectedDef.derived) {
				if (!isSourcedDef(child))
					continue

				const document = defTextDocuments.getDocument(child.source)
				if (document) {
					const location = {
						uri: URI.file(child.source).toString(),
						range: {
							start: document.positionAt(child.start),
							end: document.positionAt(child.end)
						}
					} as Location
					result.push(location)
				}
			}
			return result
		}
	}
})

// 레퍼런스로 연결된 textDocument 들은 수정하면 안됨!
connection.onRenameRequest(request => {
	console.log('onRenameRequest')
	return undefined
	/*
	const position = request.position
	const fsPath = URI.parse(request.textDocument.uri).fsPath
	const doc = defTextDocuments.getDocument(fsPath)
	const xmlDoc = defTextDocuments.getXMLDocument(fsPath)
	if (!doc || !xmlDoc) return undefined

	const node = xmlDoc.findNodeAt(doc.offsetAt(position))

	// node.
	*/
})

// TODO - can this event called before "onDocumentChanged" event?
connection.onCompletion(({ textDocument: { uri }, position }) => {
	console.log('completion request')
	const document = defTextDocuments.getDocument(uri)
	const xmlDocument = defTextDocuments.getXMLDocument(uri)
	const defDatabase = defTextDocuments.getDefDatabaseByUri(uri)
	if (xmlDocument && document && config) {
		const version = document.rwVersion
		const DB = versionDB.get(version)
		if (DB)
			return doComplete({ DB, defDatabase, document, position, version, xmlDocument })
	}
})

connection.onCompletionResolve(handler => {
	return handler
})

function updateDirtyNodes(dirtyNodes: Set<DirtyNode>) {
	const documents = AsEnumerable(dirtyNodes.values())
		.GroupBy(node => node.document.Uri)

	for (const document of documents) {
		const documentUri = document.key
		if (documentUri) {
			const defDoc = defTextDocuments.getDocument(documentUri)
			if (defDoc)
				doValidate(defDoc)
		}
	}
}

/** 
 * @param document 
 * @param xmldoc null -> no document found | undefined -> not given (try find internally)
 */
function doValidate(document: DefTextDocument, xmldoc?: XMLDocument | null) {
	const xmlDoc = xmldoc !== null ? (xmldoc || defTextDocuments.getXMLDocument(document.uri)) : null
	if (!xmlDoc) return
	const version = document.rwVersion
	const defDatabase = defTextDocuments.getDefDatabaseByUri(document.uri)
	const DB = versionDB.get(version)
	if (DB) {
		const validator = new NodeValidator(DB, document, xmlDoc, [builtInValidationParticipant], defDatabase)
		const diagnostics = validator.validateNodes()
		connection.sendDiagnostics({ uri: document.uri, diagnostics })
	}
}

let timeout: NodeJS.Timer | undefined = undefined

function validateAll() {
	if (timeout) {
		clearTimeout(timeout)
		timeout = undefined
	}

	timeout = setTimeout(() => {
		for (const document of defTextDocuments.getDocuments()) {
			doValidate(document)
		}
	}, 50)
}

defTextDocuments.onReferenceDocumentsAdded.subscribe({}, () => {
	console.log('defTextDocuments.onReferenceDocumentsAdded')
	validateAll()
})

// todo - can we put a cancellation token here and prevent unneccesary events?
defTextDocuments.onDocumentAdded.subscribe({}, (({ textDocument: document, defs, xmlDocument, dirtyNodes }) => {
	console.log('defTextDocuments.onDocumentAdded')

	updateDirtyNodes(dirtyNodes)
	/*
	dirtyNodes.values()
	validateAll()
	*/
}))

defTextDocuments.onDocumentChanged.subscribe({}, ({ textDocument, defs, xmlDocument, dirtyNodes }) => {
	// validateAll() // temp code
	// doValidate(textDocument, xmlDocument || null)
	updateDirtyNodes(dirtyNodes)
})

connection.onRequest(DecoRequestType, ({ document: { uri } }) => {
	console.log('server: DecoRequest')
	const result: DecoRequestRespond = {
		document: { uri },
		items: []
	}

	const doc = defTextDocuments.getDocument(uri)
	const xmlDoc = defTextDocuments.getXMLDocument(uri)
	if (xmlDoc && doc) {
		result.items = decoration({ doc, xmlDoc })
	}

	return result
})

connection.onHover(({ position, textDocument }) => {
	const doc = defTextDocuments.getDocument(textDocument.uri)
	const xmlDoc = defTextDocuments.getXMLDocument(textDocument.uri)

	if (doc && xmlDoc) {
		const offset = doc.offsetAt(position)
		return doHover({ document: doc, xmlDocument: xmlDoc, offset })
	}

	return undefined
})

connection.onCodeLens(({ textDocument }) => {
	console.log(textDocument.uri)
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
				}, /*
				command: {
					title: `${_in.length} references`,

				} */
			}

			return result
		})
		return results
	}
	return undefined
})

// Listen on the connection
defTextDocuments.listen(connection)
connection.listen();
