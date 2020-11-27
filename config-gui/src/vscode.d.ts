import Vue from 'vue'
import * as vscode from 'vscode'

interface vscode {
	onDidReceiveMessage: vscode.Event<any>
	cspSource: string
	html: string
	options: vscode.WebviewOptions
	asWebViewUri(localResource: vscode.Uri): vscode.Uri
	postMessage(message: any): Thenable<boolean>
}

declare module 'vue/types/vue' {
	interface Vue {
		$vscode: vscode
	}
}