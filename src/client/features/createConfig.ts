import { readFileSync } from 'fs'
import { TextDecoder, TextEncoder } from 'util'
import * as vscode from 'vscode'
import { config, message, openDialogRespond, route } from '@interop/message'

export class ConfigGUIPanel implements vscode.CustomTextEditorProvider {
	private static readonly viewType = 'RWXML.config'

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new ConfigGUIPanel(context)
		const providerRegistration = vscode.window.registerCustomEditorProvider(ConfigGUIPanel.viewType, provider)
		return providerRegistration
	}

	private _configPath?: vscode.Uri
	private _disposables: vscode.Disposable[] = []
	private _configObj: Object
	private readonly context: vscode.ExtensionContext

	private constructor(context: vscode.ExtensionContext) {
		this.context = context
		this._configObj = {}
	}

	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		try {
			this._configObj = JSON.parse(document.getText())
		} catch (err) {
			this._configObj = {}
		}

		webviewPanel.webview.options = {
			enableScripts: true
		}

		const onReceiveMessage = (message: message) => {
			switch (message.type) {
				case 'alert': {
					vscode.window.showInformationMessage(message.text)
				} break

				case 'route': {
					webviewPanel.webview.postMessage({
						path: '/config', requestId: '', type: 'route'
					} as route)
				} break

				case 'openDialog': {
					vscode.window.showOpenDialog(message.options)
						.then((uri) => {
							const fsPaths = uri?.map(d => d.fsPath)
							webviewPanel.webview.postMessage({
								type: 'openDialogRespond',
								requestId: message.requestId,
								entry: message.entry,
								uris: fsPaths
							} as openDialogRespond)
						})
				} break

				case 'config': {
					webviewPanel.webview.postMessage({
						type: 'config', data: this._configObj, requestId: ''
					} as config)
				} break

				case 'saveConfig': {
					this._configObj = message.data
					const edit = new vscode.WorkspaceEdit()
					edit.replace(document.uri, // just replace whole content
						new vscode.Range(0, 0, document.lineCount, 0),
						JSON.stringify(message.data, null, 4))

					vscode.workspace.applyEdit(edit).then(() => document.save())
				} break
			}
		}

		// webviewPanel.onDidDispose(() => this.dispose(), this._disposables)
		webviewPanel.webview.onDidReceiveMessage(onReceiveMessage, null, this._disposables)
		webviewPanel.webview.html = this.GetHTML(webviewPanel.webview)
	}

	private GetHTML(webview: vscode.Webview) {
		const js = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'config-gui', 'dist', 'main.js'))
		const chunk = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'config-gui', 'dist', 'chunk.js'))

		return `<!DOCTYPE html>
		<html lang="en">
		
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width,initial-scale=1">
			<title>config-gui</title>
			<link href="${chunk}" rel="preload" as="script">
			<link href="${js}" rel="preload" as="script">
		</head>
		
		<body><noscript><strong>We're sorry but config-gui doesn't work properly without JavaScript enabled. Please enable it to
					continue.</strong></noscript>
			<div id="app"></div>
			<script src="${chunk}"></script>
			<script src="${js}"></script>
		</body>
		
		</html>`
	}
}