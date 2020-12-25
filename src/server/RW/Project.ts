import { ConfigDatum, LoadFolders } from '../../common/config'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { CustomTextDocuments, DocumentAddedEvent, DocumentEvent } from './CustomDocuments'
import { Disposable, DocumentUri } from 'vscode-languageserver'
import { DefDatabase, DirtyNode } from './DefDatabase'
import { XMLDocument } from '../parser/XMLParser'
import { DefDocuments } from './DefDocuments'
import { TypeInfoInjector, TypeInfoMap } from '../../common/TypeInfo'
import { Event, iEvent } from '../../common/event'

/** decorator to call function when the version is matched */
/*
function validateVersion(target: Project, propertyName: string, descriptor: TypedPropertyDescriptor<any>): void {
	const originalMethod = descriptor.value
	descriptor.value = function (version: string, ...args: any[]) {
		if (version === target.version)
			originalMethod?.apply(target, args)
	}
}
*/

export interface ProjectChangeEvent {
	defDocuments: DefDocuments
	defDB: DefDatabase
	typeInfoMap: TypeInfoMap
	dirtyNodes: Set<DirtyNode>
}

/**
 * Project is a unit that represents single version
 * including Def, Assemblies, References... etc
 */
export class Project implements Disposable {
	public readonly DefDB = new DefDatabase(this.version)
	private readonly typeInfoInjector = new TypeInfoInjector(this.typeInfoMap)
	private readonly referenced = new Set<string>()
	public readonly DefDocuments = new DefDocuments(this.typeInfoInjector)
	private _Change = new Event<ProjectChangeEvent>()
	public get Change(): iEvent<ProjectChangeEvent> { return this._Change }

	constructor(
		public readonly version: string,
		public readonly loadFolders: LoadFolders,
		public readonly typeInfoMap: TypeInfoMap,
		private readonly TextDocuments: CustomTextDocuments
	) {
		this.registerEventHandlers()
	}
	private registerEventHandlers() {
		this.TextDocuments.DocumentAdded.subscribe(this, this.onDefFileAdded.bind(this))
		this.TextDocuments.DocumentChanged.subscribe(this, this.onDefFileChanged.bind(this))
		this.TextDocuments.DocumentDeleted.subscribe(this, this.onDefFileDeleted.bind(this))
	}

	isReferenced(uri: DocumentUri): boolean {
		return this.referenced.has(uri)
	}

	dispose(): void {
		// TODO - add destructor
	}

	private onDefFileAdded(event: DocumentAddedEvent): Set<DirtyNode> {
		if (event.isReferenced)
			this.referenced.add(event.textDocument.uri)

		const DefDocument = this.DefDocuments.DocumentAdd(event.textDocument)
		const dirtyNodes = this.DefDB.update(event.textDocument.uri, DefDocument.defs)
		return dirtyNodes
	}

	private onDefFileChanged(event: DocumentEvent): Set<DirtyNode> {
		const DefDocument = this.DefDocuments.DocumentChange(event.textDocument)
		const dirtyNodes = this.DefDB.update(event.textDocument.uri, DefDocument.defs)
		return dirtyNodes
	}

	private onDefFileDeleted(event: DocumentEvent) {
		this.DefDB.delete(event.textDocument.uri)
		this.DefDocuments.DocumentDelete(event.textDocument.uri)
	}

	private onFileAdded(uri: DocumentUri) {

	}

	private onFileDeleted(uri: DocumentUri) {

	}
}