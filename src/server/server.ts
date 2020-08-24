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
	MarkupContent
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

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. 
const documents: TextDocuments<RWTextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// const defaultConfig: config = { folders: { } } as any
// let _config: config
// const configfileUri: null | Uri = null

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
			}
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

	connection.onNotification(DefFileAddedNotificationType, params => {
		console.log(params.path)
	})
});

import * as fs from 'fs'
import * as path from 'path'

const mockDataPath = path.join(__dirname, './testData/output.json') // for development only
const mockTypeData = JSON.parse(fs.readFileSync(mockDataPath, { encoding: 'utf-8' }))

import { objToTypeInfos, TypeInfoMap, TypeInfoInjector } from './RW/TypeInfo'
import { NodeValidator } from './features/NodeValidator';
const typeInfos = objToTypeInfos(mockTypeData)
const typeInfoMap = new TypeInfoMap(typeInfos)
const injector = new TypeInfoInjector(typeInfoMap)

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.

let xmlDoc: XMLDocument = parse('') // create empty document
let textDoc: TextDocument
const completion = new RWXMLCompletion((path: absPath) => {
	return connection.sendRequest(querySubFilesRequestType, path)
})
import { builtInValidationParticipant } from './features/BuiltInValidator'

connection.onCompletion(handler => {
	if(xmlDoc.root && xmlDoc.root.tag === 'Defs')
		return completion.doComplete(textDoc, handler.position, xmlDoc)

	return undefined
})

import { LoadFoldersRequestType } from '../common/config'
import { from } from 'linq-es2015';
import { RWTextDocument } from './documents';
import { FileSystem } from 'vscode-languageserver/lib/files';
import { absPath } from '../common/common';
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType } from '../common/Defs';

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

// connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	// connection.console.log('We received an file change event');
// });

// This handler resolves additional information for the item selected in
// the completion list.

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


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
