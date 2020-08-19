import 'vscode-languageserver'
import * as vscode_client from 'vscode-languageclient'
import * as vscode from 'vscode'
import { DidChangeConfigurationNotification } from 'vscode-languageserver'

export interface config {
	folders: {
		[version: string]: rwDirectory
	}
}

type pathLike = string

export interface rwDirectory {
	About: pathLike
	Assemblies?: pathLike
	Languages?: pathLike
	Defs?: pathLike
	Textures?: pathLike
	Sounds?: pathLike
	Patches?: pathLike
}

const config: config = { folders: { } }

// client
export function registerConfigWatcher (client: vscode_client.LanguageClient) {
	const fileWatcher = vscode.workspace.createFileSystemWatcher('/rwconfigrc.json')
	console.log(`start watching '/rwconfigrc.json`)
	function update (listener: vscode.Uri) {
		const object = listener.toJSON()
		client.sendNotification(DidChangeConfigurationNotification.type, object)
	}
	fileWatcher.onDidChange(update)
	fileWatcher.onDidCreate(update)
	fileWatcher.onDidDelete(listener => client.sendNotification(DidChangeConfigurationNotification.type, {} as any))

}