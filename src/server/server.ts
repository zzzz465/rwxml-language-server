/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	MarkupContent,
	Declaration,
	Location
} from 'vscode-languageserver';

import { URI } from 'vscode-uri'

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import './parser/XMLParser'
import './testData/output.json'
import { RWXMLCompletion } from './features/RWXMLCompletion'
import { parse, Node, XMLDocument } from './parser/XMLParser';
// import { config, RWTextDocument } from '@common/config'
import { LoadFolders, querySubFilesRequestType } from '../common/config'
import { DefTextDocuments, isReferencedDef, sourcedDef, isSourcedDef } from './RW/DefTextDocuments';
import { objToTypeInfos, TypeInfoMap, TypeInfoInjector, getDefIdentifier, def } from './RW/TypeInfo';
import { absPath } from '../common/common';
import * as fs from 'fs'
import * as path from 'path'
import { ConfigChangedNotificationType, getLoadFolders } from '../client/config';

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

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.

const xmlDoc: XMLDocument = parse('') // create empty document
let textDoc: TextDocument
const completion = new RWXMLCompletion((path: absPath) => {
	return connection.sendRequest(querySubFilesRequestType, path)
})

connection.onCompletion(handler => {
	if(xmlDoc.root && xmlDoc.root.tag === 'Defs')
		return completion.doComplete(textDoc, handler.position, xmlDoc)

	return undefined
})

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

connection.onNotification(ConfigChangedNotificationType, config => {
	defTextDocuments.setVersionGetter(path => {
		return getLoadFolders(config, path)?.version || null
	})
})

connection.onDeclaration(request => {
	const uri = request.textDocument.uri
	const fsPath = URI.parse(uri).fsPath
	const defs = defTextDocuments.getDefs(fsPath)
	const textDocument = defTextDocuments.getDocument(fsPath)
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

connection.onDefinition(request => {
	const uri = request.textDocument.uri
	const fsPath = URI.parse(uri).fsPath
	const defs = defTextDocuments.getDefs(fsPath)
	const textDocument = defTextDocuments.getDocument(fsPath)
	if (textDocument) {
		for (const def of defs) {
			const offset = textDocument.offsetAt(request.position)
			if (def.start < offset && offset < def.end) {
				return {
					uri: uri,
					range: {
						start: textDocument.positionAt(def.start),
						end: textDocument.positionAt(def.end)
					}
				}
			}
		}
	}
})

connection.onTypeDefinition(request => {
	const uri = request.textDocument.uri
	const fsPath = URI.parse(uri).fsPath
	const defs = defTextDocuments.getDefs(fsPath)
	const textDocument = defTextDocuments.getDocument(fsPath)
	if (textDocument) {
		for (const def of defs) {
			const offset = textDocument.offsetAt(request.position)
			if (def.start < offset && offset < def.end) {
				return {
					uri: uri,
					range: {
						start: textDocument.positionAt(def.start),
						end: textDocument.positionAt(def.end)
					}
				}
			}
		}
	}
})

connection.onImplementation(request => {
	const uri = request.textDocument.uri
	const fsPath = URI.parse(uri).fsPath
	const defs = defTextDocuments.getDefs(fsPath)
	const textDocument = defTextDocuments.getDocument(fsPath)
	if (textDocument) {
		for (const def of defs) {
			const offset = textDocument.offsetAt(request.position)
			if (def.start < offset && offset < def.end) {
				return {
					uri: uri,
					range: {
						start: textDocument.positionAt(def.start),
						end: textDocument.positionAt(def.end)
					}
				}
			}
		}
	}

	return undefined
})

connection.onReferences(request => {
	const uri = request.textDocument.uri
	const fsPath = URI.parse(uri).fsPath
	const defs = defTextDocuments.getDefs(fsPath)
	const textDocument = defTextDocuments.getDocument(fsPath)
	if (textDocument) {
		for (const def of defs) {
			const offset = textDocument.offsetAt(request.position)
			if (def.start < offset && offset < def.end) {
				const result: Location = {
					uri: textDocument.uri,
					range: {
						start: textDocument.positionAt(def.start),
						end: textDocument.positionAt(def.end)
					}
				}
				return [result]
			}
		}
	}
})

// Listen on the connection
connection.listen();
defTextDocuments.listen(connection)