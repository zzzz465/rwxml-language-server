/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, FileSystemWatcher } from 'vscode';
import * as vscode from 'vscode'
import { parseConfig, LoadFolders, config } from './config'
import { LoadFoldersRequestType, querySubFilesRequestType } from '../common/config'
import { absPath } from '../common/common'
import { DefFileChangedNotificationType, DefFileRemovedNotificationType } from '../common/Defs'

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	DidChangeWorkspaceFoldersNotification,
	DidChangeConfigurationNotification,
	DidChangeWatchedFilesNotification,
	DidChangeTextDocumentNotification
} from 'vscode-languageclient';
import { SSL_OP_CISCO_ANYCONNECT } from 'constants';
import { type } from 'os';
import { fstat } from 'fs';
import { DefFileAddedNotificationType } from '../common/Defs';

let client: LanguageClient;
let configWatcher: FileSystemWatcher

export async function activate(context: ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('out', 'server', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	let config: config | null = null
	const DefsWatcher = vscode.workspace.createFileSystemWatcher('**/Defs/**/*.xml')

	configWatcher = vscode.workspace.createFileSystemWatcher('**/rwconfigrc.json')
	const configFile = await vscode.workspace.findFiles('**/rwconfigrc.json')
	if (configFile.length > 0) {
		const object = JSON.parse((await vscode.workspace.fs.readFile(configFile[0])).toString())
		config = parseConfig(object, configFile[0])
	}

	configWatcher.onDidCreate(uri => {
		console.log('we received a config create event')
	})
	configWatcher.onDidChange(uri => {
		console.log('we received a config change event')
		// client.sendNotification(DidChangeConfigurationNotification.type)
	})
	configWatcher.onDidDelete(uri => {
		console.log('we received a config delete event')
	})
	
	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'xml' }],
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'rwxmlLangServer',
		'RWXML Language server',
		serverOptions,
		clientOptions
	);

	// client.registerFeature(staticfeatur)

	// client.registerFeature()

	// Start the client. This will also launch the server
	client.start();
	await client.onReady()

	client.onRequest(LoadFoldersRequestType, (params, token) => {
		return config?.getLoadFolders(params)
	})

	client.onRequest(querySubFilesRequestType, async (absPath, token) => {
		const files = await vscode.workspace.findFiles(
			new vscode.RelativePattern(absPath, '**')
		)
		return files.map(uri => uri.fsPath)
	})

	
	DefsWatcher.onDidCreate(async (uri) => {
		client.sendNotification(DefFileAddedNotificationType, {
			path: uri.fsPath,
			text: (await vscode.workspace.fs.readFile(uri)).toString()
		})
	})

	DefsWatcher.onDidChange(async uri => {
		client.sendNotification(DefFileChangedNotificationType, {
			path: uri.fsPath,
			text: (await vscode.workspace.fs.readFile(uri)).toString()
		})
	})

	DefsWatcher.onDidDelete(uri => {
		client.sendNotification(DefFileRemovedNotificationType, uri.fsPath)
	})
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
