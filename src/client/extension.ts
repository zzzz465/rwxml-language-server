/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
// this code was built based on Microsoft vscode lsp example.
import * as path from 'path';
import { workspace, ExtensionContext, FileSystemWatcher } from 'vscode';
import * as vscode from 'vscode'
import { parseConfig } from './config'
import { querySubFilesRequestType, ConfigDatum, ConfigChangedNotificationType } from '../common/config'
import { DefFileChangedNotificationType, DefFileRemovedNotificationType, ReferencedDefFileAddedNotificationType, RefDefFilesChangedParams } from '../common/Defs'
import { glob as glob_callback } from 'glob'

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';
import { DefFileAddedNotificationType } from '../common/Defs';
import { FileWatcher } from './fileWatcher';
import * as fs from 'fs'
import * as util from 'util'

const glob = util.promisify(glob_callback)

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
		
	// Start the client. This will also launch the server
	client.start();
	const _fileWatcher = new FileWatcher()
	// client.registerFeature()
	await client.onReady()
	
	_fileWatcher.listen(client)

	let config: ConfigDatum | null = null
	
	configWatcher = vscode.workspace.createFileSystemWatcher('**/rwconfigrc.json')
	const configFile = await vscode.workspace.findFiles('**/rwconfigrc.json')
	
	if (configFile.length > 0) {
		const object = JSON.parse((await vscode.workspace.fs.readFile(configFile[0])).toString())
		config = parseConfig(object, configFile[0])
	}
	
	configWatcher.onDidCreate(async uri => {
		const text = (await vscode.workspace.fs.readFile(uri)).toString()
		const object = JSON.parse(text)
		config = parseConfig(object, uri)
		client.sendNotification(ConfigChangedNotificationType, config)
	})
	configWatcher.onDidChange(async uri => {
		const text = (await vscode.workspace.fs.readFile(uri)).toString()
		const object = JSON.parse(text)
		config = parseConfig(object, uri)
		client.sendNotification(ConfigChangedNotificationType, config)
	})
	configWatcher.onDidDelete(uri => {
		client.sendNotification(ConfigChangedNotificationType, config)
	})

	if (config) {
		client.sendNotification(ConfigChangedNotificationType, config)
		// 임시로 넣은 코드, 첫 실행할때만 Def을 전송하게 될 것
		for (const [version, obj] of Object.entries(config.folders)) {

			if (obj.Defs) {
				glob_callback('**/*.xml', { absolute: true, cwd: vscode.Uri.parse(obj.Defs).fsPath },
				(err, files) => {
					for (const path of files) {
						const uri = vscode.Uri.file(path)
						fs.promises.readFile(path, 'utf-8')
						.then(text => {
							client.sendNotification(DefFileAddedNotificationType, {
								path: uri.toString(),
								text
							})
						})
					}
				})
			}
			if (obj.DefReferences) {
				const defReferences = obj.DefReferences;
				(async () => {
					const messages: RefDefFilesChangedParams = []
					const promises: Promise<void>[] = []
					for await (const referencePath of defReferences) {
						const files: Record<string, string> = {}
						const paths = await glob('**/*.xml', { absolute: true, cwd: vscode.Uri.parse(referencePath).fsPath})
						for (const path of paths) {
							promises.push((async () => {
								const text = await fs.promises.readFile(path, 'utf-8')
								const uriPath = vscode.Uri.file(path).toString()
								files[uriPath] = text
							})())
						}
						messages.push({
							version: version,
							baseUri: referencePath,
							files
						})
					}
					await Promise.all(promises) // await until all data is loaded.
					client.sendNotification(ReferencedDefFileAddedNotificationType, messages)
				})()
				
			}
		}
	}
	
	client.onRequest(querySubFilesRequestType, async (absPath, token) => {
		const files = await vscode.workspace.findFiles(
			new vscode.RelativePattern(absPath, '**')
			)
			return files.map(uri => uri.toString())
	})
	
	const DefsWatcher = vscode.workspace.createFileSystemWatcher('**/Defs/**/*.xml')
	
	DefsWatcher.onDidCreate(async (uri) => {
		client.sendNotification(DefFileAddedNotificationType, {
			path: uri.toString(),
			text: (await vscode.workspace.fs.readFile(uri)).toString()
		})
	})

	DefsWatcher.onDidChange(async uri => {
		client.sendNotification(DefFileChangedNotificationType, {
			path: uri.toString(),
			text: (await vscode.workspace.fs.readFile(uri)).toString()
		})
	})

	DefsWatcher.onDidDelete(uri => {
		client.sendNotification(DefFileRemovedNotificationType, uri.toString())
	})
	
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
