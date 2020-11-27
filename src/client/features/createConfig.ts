import { readFileSync } from 'fs'
import * as vscode from 'vscode'

class ConfigGUIPanel {
	private static currentPanel: ConfigGUIPanel | undefined
	public static showPanel(extensionUri: vscode.Uri): void {
		if (this.currentPanel) {
			this.currentPanel._panel.reveal()
		} else {

			const panel = vscode.window.createWebviewPanel(
				'RWXML.config',
				'configuration GUI',
				vscode.ViewColumn.Active,
				{
					enableScripts: true
				}
			)

			this.currentPanel = new ConfigGUIPanel(panel, extensionUri)
		}
	}

	private readonly _panel: vscode.WebviewPanel
	private readonly _extensionUri: vscode.Uri
	private _disposables: vscode.Disposable[] = []

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._extensionUri = extensionUri
		this._panel = panel
		panel.onDidDispose(() => this.dispose(), this._disposables)

		this._panel.onDidChangeViewState(e => {

		})

		this._panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'alert': {
					vscode.window.showInformationMessage(message.text)
				} break
			}
		}, null, this._disposables)

		this._panel.webview.html = this.GetHTML(panel.webview)
	}

	public dispose() {
		ConfigGUIPanel.currentPanel = undefined
		this._panel.dispose()

		this._disposables.map(d => d.dispose())
	}

	private GetHTML(webview: vscode.Webview) {
		const js = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'config-gui', 'dist', 'main.js'))
		const chunk = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'config-gui', 'dist', 'chunk.js'))
		// const css = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'config-gui', 'dist', 'css', 'app.5361237a.css'))
		// const html = readFileSync(vscode.Uri.joinPath(this._extensionUri, 'config-gui', 'dist', 'index.html').fsPath)

		// return html

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


export default function installGUI(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('RWXML.makeConfig', () => {
			ConfigGUIPanel.showPanel(context.extensionUri)
		})
	)
}