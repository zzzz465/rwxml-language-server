/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
// this code was built based on Microsoft vscode lsp example.
import * as path from 'path'
import { workspace, ExtensionContext, FileSystemWatcher } from 'vscode'
import * as vscode from 'vscode'
import { Uri } from 'vscode'
import { parseConfig } from './config'
import { ConfigDatum, ConfigChangedRequestType, ConfigChangedParams } from '../common/config'
import { DefFileChangedNotificationType, DefFileRemovedNotificationType, ReferencedDefFileAddedNotificationType, RefDefFilesChangedParams, DefFilesChanged } from '../common/Defs'
import { glob as glob_callback } from 'glob'

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient'
import { DefFileAddedNotificationType } from '../common/Defs'
import { ProjectWatcher } from './projectWatcher'
import * as fs from 'fs'
import * as util from 'util'
import { extractTypeInfos } from './extractor'
import { Event } from '../common/event'
import { DecoRequestType } from '../common/decoration'
import { applyDecos } from './features/decoration'
import { ConfigGUIPanel } from './features/createConfig'
import { TextureChangedNotificaionType, TextureChangedNotificationParams } from '../common/textures'

const glob = util.promisify(glob_callback)
const exists = util.promisify(fs.exists)

let client: LanguageClient
let configWatcher: FileSystemWatcher

export async function activate(context: ExtensionContext): Promise<void> {
	const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development
	// The server is implemented in node
	let serverModule = ''
	if (process.env.isWebpack) {
		serverModule = context.asAbsolutePath(path.join('dist', 'server', 'index.js'))
	} else {
		serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'))
	}
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] }

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	}

	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'xml' }],
	}

	// Create the language client and start the client.
	client = new LanguageClient(
		'rwxmlLangServer',
		'RWXML Language server',
		serverOptions,
		clientOptions
	)

	// Start the client. This will also launch the server
	client.start()
	await client.onReady()

	vscode.window.showInformationMessage(`webpack: ${process.env.isWebpack}`)

	ConfigGUIPanel.register(context) // disposable?

	let timeout: NodeJS.Timer | undefined = undefined
	let activeEditor = vscode.window.activeTextEditor

	const projectWatcher = new ProjectWatcher(client)

	/** @deprecated (moved into projectWatcher) called when onConfigfileChanged is called */
	let disposeEvent: Event<void> = new Event<void>()

	const initialFile = await vscode.workspace.findFiles('**/rwconfigrc.json')
	if (initialFile) {
		const file = initialFile[0]
		console.log('initial config read')
		await onConfigfileChanged(file)
	}

	configWatcher = vscode.workspace.createFileSystemWatcher('**/rwconfigrc.json')

	configWatcher.onDidCreate(onConfigfileChanged)
	configWatcher.onDidChange(onConfigfileChanged)
	// configWatcher.onDidDelete(onConfigfileChanged) // should we handle this?

	async function checkPathValid(paths: string[]): Promise<{ valid: boolean, invalidItems: string[] }> {
		const promises: Promise<void>[] = []
		let valid = true
		const invalidItems: string[] = []
		for (const path of paths) {
			const p = exists(path)
				.then(flag => {
					if (!flag) {
						valid = false
						invalidItems.push(path)
					}
				})
			promises.push(p)
		}

		await Promise.all(promises)
		return { valid, invalidItems }
	}

	async function populateDefFiles(paths: string[]): Promise<{ [path: string]: string }> {
		const result: { [path: string]: string } = {}
		const promises: Promise<void>[] = []
		paths.map(path => {
			promises.push(fs.promises.readFile(path, 'utf-8')
				.then(text => {
					const uri = Uri.file(path).toString()
					result[uri] = text
				}))
		})
		await Promise.all(promises)
		return result
	}

	async function onConfigfileChanged(configUri: Uri) {
		console.log('client: reload config')
		disposeEvent.Invoke()
		disposeEvent = new Event<void>()
		const text = (await fs.promises.readFile(configUri.fsPath)).toString()
		let object: any | undefined = undefined
		try {
			object = JSON.parse(text)
		} catch (err) {
			return
		}

		const configDatum = parseConfig(object, configUri)

		const parms: ConfigChangedParams = { configDatum, data: {} }

		const promises: Promise<void>[] = []

		for (const [version, obj] of Object.entries(configDatum.folders)) {
			if (obj.AssemblyReferences) {
				const assemRefs = obj.AssemblyReferences.map(uri => Uri.parse(uri).fsPath)
				if (assemRefs.length == 0) continue
				const p = (async () => {
					const res = await checkPathValid(assemRefs)
					if (res.valid) {
						try {
							const rawTypeInfo = await extractTypeInfos(context, assemRefs)
							parms.data[version] = { rawTypeInfo }
						} catch (err) {
							vscode.window.showErrorMessage(`failed extracting data, err: ${err}`)
						}
					} else {
						const errmsg = `invalid path:${res.invalidItems}`
						vscode.window.showErrorMessage(errmsg)
					}
				})()
				promises.push(p)
			}
		}

		await Promise.all(promises)

		// await server to be ready.
		await client.sendRequest(ConfigChangedRequestType, parms)

		for (const [version, obj] of Object.entries(configDatum.folders)) {
			if (obj.Defs) {
				const defPath = vscode.Uri.parse(obj.Defs).fsPath;
				(async () => {
					const params: DefFilesChanged = { version, files: {} }
					const paths = await glob('**/*.xml', { absolute: true, cwd: defPath })
					params.files = await populateDefFiles(paths)
					client.sendNotification(DefFileAddedNotificationType, params)
				})()
			}

			if (obj.DefReferences) {
				const refPaths = obj.DefReferences
				for (const refPath of refPaths) {
					(async () => {
						const params: RefDefFilesChangedParams = { version, files: {} }
						const paths = await glob('**/*.xml', { absolute: true, cwd: vscode.Uri.parse(refPath).fsPath })
						params.files = await populateDefFiles(paths)
						client.sendNotification(ReferencedDefFileAddedNotificationType, params)
					})()
				}
			}

			if (obj.Textures) {
				const texturePaths = [obj.Textures] // 모든 path를 배열로 바꿀껀데, 지금은 임시로 이렇게
				for (const texPath of texturePaths) {
					(async () => {
						const params: TextureChangedNotificationParams = { version, uris: [] }
						params.uris = (await glob('**/*.{png, jpg, jpeg, gif}', { absolute: true, cwd: vscode.Uri.parse(texPath).fsPath }))
							.map(fsPath => Uri.file(fsPath).toString())
						client.sendNotification(TextureChangedNotificaionType, params)
					})()
				}
			}
		}

		projectWatcher.watch(configDatum)


		if (activeEditor)
			triggerUpdateDecorations()
	}

	async function updateDecorations() {
		if (!activeEditor)
			return

		console.log('client: updateDecorations')

		const { document: { uri }, items } = await client.sendRequest(DecoRequestType, {
			document: { uri: activeEditor.document.uri.toString() }
		})

		// need to ensure activeEditor isn't changed while async
		if (activeEditor && activeEditor.document.uri.toString() === uri)
			applyDecos(activeEditor, items)
	}

	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout)
			timeout = undefined
		}
		timeout = setTimeout(updateDecorations, 300)
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor
		if (editor) {
			triggerUpdateDecorations()
		}
	}, null, context.subscriptions)

	vscode.workspace.onDidChangeTextDocument(event => {
		console.log('client: textDocument changed' + ` ver: ${event.document.version}`)
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations()
		}
	}, null, context.subscriptions)
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined
	}
	return client.stop()
}