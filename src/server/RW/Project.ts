import { LoadFolders } from 'src/common/config'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DefTextDocuments } from './DefTextDocuments'
import { Disposable, DocumentUri } from 'vscode-languageserver'
import { DefDatabase } from './DefDatabase'
import { XMLDocument } from '../parser/XMLParser'

/**
 * Project is a unit that represents single version
 * including Def, Assemblies, References... etc
 */
export class Project implements Disposable {
	private DefDB = new DefDatabase(this.version)
	private XMLDB = new Map<DocumentUri, XMLDocument>()

	constructor(
		public readonly version: string,
		public readonly loadFolders: LoadFolders,
		private readonly TextDocuments: DefTextDocuments
	) {
		this.registerEventHandlers()
	}
	dispose(): void {
		// TODO - add destructor
	}

	private registerEventHandlers() {
		// TODO
	}

	private onDefFileAdded(document: TextDocument) {

	}

	private onDefFileChanged(document: TextDocument) {

	}

	private onDefFileDeleted(uri: DocumentUri) {

	}

	private onFileAdded(uri: DocumentUri) {

	}

	private onFileDeleted(uri: DocumentUri) {

	}
}