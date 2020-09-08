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
	Location
} from 'vscode-languageserver';

import { URI } from 'vscode-uri'

import './parser/XMLParser'
import './testData/output.json'
import { RWXMLCompletion } from './features/RWXMLCompletion'
import { ConfigDatum, getLoadFolders, ConfigChangedRequestType } from '../common/config'
import { DefTextDocuments, isReferencedDef, isSourcedDef } from './RW/DefTextDocuments';
import { objToTypeInfos, TypeInfoMap, TypeInfoInjector, def, TypeInfo, isTypeNode } from '../common/TypeInfo';
import { /* absPath */ URILike } from '../common/common';
import { NodeValidator } from './features/NodeValidator';
import { builtInValidationParticipant } from './features/BuiltInValidator';
import { typeDB } from './typeDB';
import { DecoRequestType, DecoRequestRespond, DecoType } from '../common/decoration';
import { BFS } from './utils/nodes';
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
				triggerCharacters: [ '<' ]
			},
			// definitionProvider: true,
			declarationProvider: true,
			referencesProvider: true,
			renameProvider: {
				prepareProvider: false,
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

let versionDB: Map<string, typeDB> = new Map()

const defTextDocuments = new DefTextDocuments()
defTextDocuments.versionDB = (function () {
	const x = {
		get versionDB() {
			return versionDB
		}
	}
	return x.versionDB
})()

defTextDocuments.setVersionGetter((path) => {
	if (config)
		return getLoadFolders(config, path)?.version
})

let config: ConfigDatum | null = null

/** version - URILike, 파일이 있는지 없는지 체크하기 위함 */
const files: Map<string, Set<URILike>> = new Map()

// re-initialize everything when the config changes.
connection.onRequest(ConfigChangedRequestType, ({ configDatum, typeInfoDatum }) => {
	console.log('server: received config changed event')
	config = configDatum
	versionDB = new Map() // FIXME - delete this
	for (const [version, datum] of Object.entries(typeInfoDatum)) {
		const map = new TypeInfoMap ( objToTypeInfos(datum) )
		versionDB.set(version, {
			injector: new TypeInfoInjector(map),
			typeInfoMap: map
		})
	}
	defTextDocuments.clear()
	defTextDocuments.versionDB = versionDB
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
	const defDatabase = defTextDocuments.getDefDatabaseByUri(uri) || undefined
	if (xmlDocument && document && config) {
		const version = getLoadFolders(config, document.uri)?.version
		if (version) {
			const typeInfoMap = versionDB.get(version)?.typeInfoMap
			if (typeInfoMap) {
				const result = new RWXMLCompletion().doComplete(document, position, xmlDocument, typeInfoMap, defDatabase)
				console.log('resolved')
				return result
			}
		}
	}
})

connection.onCompletionResolve(handler => {
	return handler
})

function validateAll() {
	for (const document of defTextDocuments.getDocuments()) {
		const xmlDoc = defTextDocuments.getXMLDocument(document.uri)
		if (!xmlDoc) continue
		let version: string | undefined = undefined
		let files2: Set<string> | undefined = undefined
		if (config) {
			version = getLoadFolders(config, document.uri)?.version
			if (version)
				files2 = files.get(version)
		}
		if (version) {
			const typeInfoMap = versionDB.get(version)?.typeInfoMap
			if (typeInfoMap) {
				const defDatabase = defTextDocuments.getDefDatabaseByUri(document.uri) || undefined
				const validator = new NodeValidator(typeInfoMap, document, xmlDoc,
					[builtInValidationParticipant], 
					files2, defDatabase)
					const result = validator.validateNodes()
					connection.sendDiagnostics({ uri: document.uri, diagnostics: result })
			}
		}
	}
}

defTextDocuments.onReferenceDocumentsAdded.subscribe({}, () => {
	console.log('defTextDocuments.onReferenceDocumentsAdded')
	validateAll()
})

// todo - can we put a cancellation token here and prevent unneccesary events?
defTextDocuments.onDocumentAdded.subscribe({}, (({ textDocument: document, defs, xmlDocument }) => {
	console.log('defTextDocuments.onDocumentAdded')
	validateAll()
	/*
	if (!xmlDocument) return
	let files2: Set<string> | undefined = undefined
	if (config) {
		const version = getLoadFolders(config, document.uri)?.version
		if (version)
			files2 = files.get(version)
	}
	const validator = new NodeValidator(typeInfoMap,
		document,
		xmlDocument,
		[builtInValidationParticipant],
		files2)
	const validationResult = validator.validateNodes()
	connection.sendDiagnostics({ uri: document.uri, diagnostics: validationResult })
	*/
}))

defTextDocuments.onDocumentChanged.subscribe({}, ({ textDocument: document, defs, xmlDocument }) => {
	console.log('defTextDocuments.onDocumentChanged + validate')
	if (!xmlDocument) return
	const defDatabase = defTextDocuments.getDefDatabaseByUri(document.uri) || undefined
	let files2: Set<string> | undefined = undefined
	let version: string | undefined = undefined
	if (config) {
		version = getLoadFolders(config, document.uri)?.version
		if (version)
			files2 = files.get(version)
	}
	if (version) {
		const typeInfoMap = versionDB.get(version)?.typeInfoMap
		if (typeInfoMap) {
			const validator = new NodeValidator(typeInfoMap, document, xmlDocument, [builtInValidationParticipant], files2, defDatabase)
			const validationResult = validator.validateNodes()
			connection.sendDiagnostics({ uri: document.uri, diagnostics: validationResult })
		}
	}
})

connection.onRequest(DecoRequestType, ({ document: { uri } }) => {
	const result: DecoRequestRespond = {
		document: { uri },
		items: []
	}
	const items = result.items
	const textDoc = defTextDocuments.getDocument(uri)
	const xmlDoc = defTextDocuments.getXMLDocument(uri)
	if (textDoc && xmlDoc) {
		const nodes = BFS(xmlDoc)
		for (const node of nodes) {
			if (isTypeNode(node)) {
				const typeInfo = node.typeInfo
				if (typeInfo.specialType?.enum && typeInfo.leafNodeCompletions) {
					if (node.text) {
						const text = node.text.content
						// only check exact match
						if(typeInfo.leafNodeCompletions.has(text)) {
							items.push({
								range: {
									start: textDoc.positionAt(node.text.start),
									end: textDoc.positionAt(node.text.end)
								},
								type: DecoType.content_Enum
							})
						}
					}
				}
				/*
				1) enum인지 체크하고
				2) enum value == text 인지 체크한다음
				3) 값 넘겨주기
				*/
			}
		}
	}

	return result
})

// Listen on the connection
connection.listen();
defTextDocuments.listen(connection)
