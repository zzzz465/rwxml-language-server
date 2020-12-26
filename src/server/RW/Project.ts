import { ConfigDatum, LoadFolders } from '../../common/config'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { CustomTextDocuments, DocumentAddedEvent, DocumentEvent } from './CustomDocuments'
import { Disposable, DocumentUri } from 'vscode-languageserver'
import { DefDatabase, DirtyNode } from './DefDatabase'
import { XMLDocument } from '../parser/XMLParser'
import { DefDocument, DefDocuments } from './DefDocuments'
import { TypeInfoInjector, TypeInfoMap } from '../../common/TypeInfo'
import { Event, iEvent } from '../../common/event'
import { Directory, File, RootDirectory } from './Folder'
import { URI } from 'vscode-uri'

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

export type ProjectEvent = ProjectChangeEvent | ProjectDeleteEvent
export interface ProjectChangeEvent {
	type: 'change'
	project: Project
	dirtyNodes: Set<DirtyNode>,
	textDocument: TextDocument,
	defDocument: DefDocument
}

export interface ProjectDeleteEvent {
	type: 'delete'
	project: Project
	dirtyNodes: Set<DirtyNode>
}

const enum FileKind {
	Texture,
	Sound
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
	private _Change = new Event<ProjectEvent>()
	public get Change(): iEvent<ProjectEvent> { return this._Change }
	public readonly Textures = new RootDirectory()

	constructor(
		public readonly version: string,
		public readonly loadFolders: LoadFolders,
		public readonly typeInfoMap: TypeInfoMap,
		private readonly TextDocuments: CustomTextDocuments,
		private readonly _TextureAddEvent: Event<File[]>,
		private readonly _TextureDeleteEvent: Event<File[]>
	) {
		this.registerEventHandlers()

		if (loadFolders.Textures)
			this.Textures.AddRoot(URI.parse(loadFolders.Textures).fsPath)
	}
	private registerEventHandlers() {
		this.TextDocuments.DocumentAdded.subscribe(this, this.onDefFileAdded.bind(this))
		this.TextDocuments.DocumentChanged.subscribe(this, this.onDefFileChanged.bind(this))
		this.TextDocuments.DocumentDeleted.subscribe(this, this.onDefFileDeleted.bind(this))
		this._TextureAddEvent.subscribe(this, (files) => files.map(file => this.onFileAdded(file, FileKind.Texture)))
		this._TextureDeleteEvent.subscribe(this, (files) => files.map(file => this.onFileDeleted(file, FileKind.Texture)))
	}

	isReferenced(uri: DocumentUri): boolean {
		return this.referenced.has(uri)
	}

	dispose(): void {
		this.TextDocuments.DocumentAdded.unsubscribe(this)
		this.TextDocuments.DocumentChanged.unsubscribe(this)
		this.TextDocuments.DocumentDeleted.unsubscribe(this)
		this._TextureAddEvent.unsubscribe(this)
		this._TextureDeleteEvent.unsubscribe(this)
	}

	private onDefFileAdded(event: DocumentAddedEvent): void {
		if (event.isReferenced)
			this.referenced.add(event.textDocument.uri)

		const defDocument = this.DefDocuments.DocumentAdd(event.textDocument)
		const dirtyNodes = this.DefDB.update(event.textDocument.uri, defDocument.defs)
		this._Change.Invoke({ type: 'change', project: this, dirtyNodes, textDocument: event.textDocument, defDocument })
	}

	private onDefFileChanged(event: DocumentEvent): void {
		const defDocument = this.DefDocuments.DocumentChange(event.textDocument)
		const dirtyNodes = this.DefDB.update(event.textDocument.uri, defDocument.defs)
		this._Change.Invoke({ type: 'change', project: this, dirtyNodes, textDocument: event.textDocument, defDocument })
	}

	private onDefFileDeleted(event: DocumentEvent): void {
		this.DefDB.delete(event.textDocument.uri)
		this.DefDocuments.DocumentDelete(event.textDocument.uri)
		const dirtyNodes = this.DefDB.delete(event.textDocument.uri)
		this._Change.Invoke({ type: 'delete', project: this, dirtyNodes })
	}

	private onFileAdded(file: File, kind: FileKind): void {
		switch (kind) {
			case FileKind.Texture:
				this.Textures.Add(file)
				break

			case FileKind.Sound:
				throw new Error('not implemented')

		}
	}

	private onFileDeleted(file: File, kind: FileKind): void {
		switch (kind) {
			case FileKind.Texture:
				this.Textures.Delete(file)
				break
		}
	}
}