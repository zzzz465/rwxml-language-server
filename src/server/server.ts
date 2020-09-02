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
	Location,
	CancellationToken
} from 'vscode-languageserver';

import { URI } from 'vscode-uri'

import './parser/XMLParser'
import './testData/output.json'
import { RWXMLCompletion } from './features/RWXMLCompletion'
import { parse, Node, XMLDocument } from './parser/XMLParser';
import { LoadFolders, querySubFilesRequestType, ConfigDatum, ConfigChangedNotificationType, getLoadFolders } from '../common/config'
import { DefTextDocuments, isReferencedDef, sourcedDef, isSourcedDef } from './RW/DefTextDocuments';
import { objToTypeInfos, TypeInfoMap, TypeInfoInjector, def } from './RW/TypeInfo';
import { /* absPath */ URILike } from '../common/common';
import * as fs from 'fs'
import * as path from 'path'
import { NodeValidator } from './features/NodeValidator';
import { builtInValidationParticipant } from './features/BuiltInValidator';
import { disposeWatchFileRequestType, WatchFileRequestParams, WatchFileRequestType, WatchFileAddedNotificationType, WatchFileDeletedNotificationType } from '../common/fileWatcher';
import { assert } from 'console';

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

const mockDataPath = path.join(__dirname, './testData/output.json') // for development only
const mockTypeData = JSON.parse(fs.readFileSync(mockDataPath, { encoding: 'utf-8' }))
const typeInfos = objToTypeInfos(mockTypeData)
const typeInfoMap = new TypeInfoMap(typeInfos)
const injector = new TypeInfoInjector(typeInfoMap)

/*
documents.onDidChangeContent(async change => {
	const filePath = URI.parse(change.document.uri).fsPath
	const respond = await connection.sendRequest(LoadFoldersRequestType, filePath)
	if (respond)
		change.document.loadFolders = respond

	textDoc = change.document
	const text = change.document.getText()
	if(text) {
		xmlDoc = parse(text)
		if(xmlDoc.root?.tag === 'Defs') {
			for (const defNode of xmlDoc.root.children)
				injector.Inject(defNode)
		}
	}

	const nodeValidator = new NodeValidator(typeInfoMap, textDoc, xmlDoc, [builtInValidationParticipant])
	const result = nodeValidator.validateNode()
	connection.sendDiagnostics({ uri: textDoc.uri, diagnostics: result })
	// validateTextDocument(change.document);
});
*/

// connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	// connection.console.log('We received an file change event');
// });

// This handler resolves additional information for the item selected in
// the completion list.
/*
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if(typeof item.data === 'object') {
			if (item.data.type === 'image') {
				const path = '/' + (<string>(item.data.absPath)).replace(/\\/g, '/')
				// const value = '```html'
				// 	+ `<image src="${path}" width="500" height="500" />`
				// 	+ '```'
				const markup: MarkupContent = {
					kind: 'markdown',
					value: `![image](${path})`
					// value
				}
				item.documentation = markup
			}
		}

		return item
	}
);
*/

const defTextDocuments = new DefTextDocuments()
defTextDocuments.typeInjector = injector

let config: ConfigDatum | null = null
type relativePattern = string
let watchers: WatchFileRequestParams[] = []
/** version - URILike, 파일이 있는지 없는지 체크하기 위함 */
const files: Map<string, Set<URILike>> = new Map()

connection.onNotification(ConfigChangedNotificationType, async newConfig => {
	config = newConfig

	// request client to dispose all watchers
	await Promise.all( watchers.map(p =>
		connection.sendRequest(disposeWatchFileRequestType, p)))
	
	watchers = []
	files.clear()
	// update projectfiles cache
	
	if (config) {
		const promises: (Promise<void>)[] = []
		for (const [version, folder] of Object.entries(config.folders)) {
			const set: Set<URILike> = new Set()
			files.set(version, set)
			
			// eslint-disable-next-line no-inner-declarations
			function registerInitialFiles(uris: string[]) {
				for (const uri of uris)
					set.add(uri)
			}
			
			// About
			// connection.sendRequest(WatchFileRequestType, {
				// basePath: folder.About,
				// globPattern: ''
			// } as WatchFileRequestParams)

			// Defs
			if (folder.Defs) {
				const p = connection.sendRequest(WatchFileRequestType, {
					basePath: folder.Defs,
					globPattern: '**/*.xml'
				}).then(registerInitialFiles)
				.catch(reason => console.log(reason))
				promises.push(p)
			}

			if (folder.Textures) {
				const p = connection.sendRequest(WatchFileRequestType, {
					basePath: folder.Textures,
					globPattern: '**/*.{png, jpeg, jpg, gif}'
				})
				.then(registerInitialFiles)
				.catch(reason => console.log(reason))
				promises.push(p)
			}

			// Textures

			if (folder.DefReferences) {
				for (const basePath of folder.DefReferences) {
					const p = connection.sendRequest(WatchFileRequestType, {
						basePath: basePath,
						globPattern: '**/*.xml'
					})
					.then(registerInitialFiles)
					.catch(reason => console.log(reason))
					promises.push(p)
				}
			}
		}
		await Promise.all(promises)

		// needs refactor
		const conf2 = config
		defTextDocuments.setVersionGetter(path => {
			return getLoadFolders(conf2, path)?.version || null
		})
	} else {
		defTextDocuments.setVersionGetter(path => null)
	}
})

connection.onNotification(WatchFileAddedNotificationType, uri => {
	if (!config) return
	const version = getLoadFolders(config, uri)?.version
	if (version) {
		const set = files.get(version)
		if (set) {
			assert(!set.has(uri), 'tried to add file which is already added')
			set.add(uri)
		}
	}
})

connection.onNotification(WatchFileDeletedNotificationType, uri => {
	if (!config) return
	const version = getLoadFolders(config, uri)?.version
	if (version) {
		const set = files.get(version)
		if (set) {
			const result = set.delete(uri)
			assert(result)
		}
	}
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
	if (xmlDocument && document) {
		const result = new RWXMLCompletion().doComplete(document, position, xmlDocument, defDatabase)
		console.log('resolved')
		return result
	}
})

connection.onCompletionResolve(handler => {
	return handler
})

// const diagnostics: Map<URILike, Diagnostic[]> = new Map()
// need code refactor
const key = {}
// todo - can we put a cancellation token here and prevent unneccesary events?
defTextDocuments.onDocumentAdded.subscribe(key, (({ textDocument: document, defs, xmlDocument }) => {
	console.log('defTextDocuments.onDocumentAdded')
	for (const document of defTextDocuments.getDocuments()) {
		const xmlDocument = defTextDocuments.getXMLDocument(document.uri)
		if (xmlDocument) {

			let files2: Set<string> | undefined = undefined
			if (config) {
				const version = getLoadFolders(config, document.uri)?.version
				if (version)
					files2 = files.get(version)
			}

			const defDatabase = defTextDocuments.getDefDatabaseByUri(document.uri) || undefined

			const validator = new NodeValidator(typeInfoMap, document, 
				xmlDocument, [builtInValidationParticipant],
				files2, defDatabase)
			const result = validator.validateNodes()
			connection.sendDiagnostics({ uri: document.uri, diagnostics: result })
		}
	}
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
	if (config) {
		const version = getLoadFolders(config, document.uri)?.version
		if (version)
			files2 = files.get(version)
	}
	const validator = new NodeValidator(typeInfoMap, document, xmlDocument, [builtInValidationParticipant], files2, defDatabase)
	const validationResult = validator.validateNodes()
	connection.sendDiagnostics({ uri: document.uri, diagnostics: validationResult })
})

// Listen on the connection
connection.listen();
defTextDocuments.listen(connection)