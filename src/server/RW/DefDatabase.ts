import { absPath, TextReuqestType } from '../../common/common'
import { def } from './TypeInfo';
import { IConnection, Connection, TextDocuments, TextDocumentChangeEvent } from 'vscode-languageserver';
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType } from 'common/Defs';
import { parse, XMLDocument } from 'server/parser/XMLParser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { RWTextDocument } from 'server/documents';
import { URI } from 'vscode-uri';

type version = string;

export interface versionGetter {
	(path: absPath): version | null
}

export interface DocumentChangedHandler {
	(change: RWTextDocument): void
}

function getValidDefs(doc: XMLDocument): def[] {
	if (!doc.root || !doc.root.tag || !doc.root.closed || doc.root.tag !== 'Defs')
		return []

	const defs: def[] = []
	for (const def of doc.root.children) {
		const defNameNode = def.children.find(n => n.tag === 'defName')
		if (def.closed && defNameNode && defNameNode.tag) {
			Object.assign(def, { defName: defNameNode.tag })
			defs.push(def as def)
		}
	}
	return defs
}

export class DefDocuments {
	private databases: Map<string, DefDatabase>
	private watchedFiles: Set<absPath>
	private readonly textDocuments: TextDocuments<RWTextDocument>
	private versionGetter: versionGetter | undefined
	private connection: Connection | undefined
	onDocumentChanged: ((listener: TextDocumentChangeEvent<RWTextDocument>) => void) | undefined // event handler
	constructor() {
		this.databases = new Map()
		this.watchedFiles = new Set()
		this.textDocuments = new TextDocuments(TextDocument)
	}

	setVersionGetter (getter: versionGetter): void {
		this.versionGetter = getter
		this.databases.clear()
		this.refreshDocuments()
	}

	getDefs (absPath: absPath): def[] {
		let version: string | null
		if (!this.versionGetter || !(version = this.versionGetter(absPath)))
			return []
		
		let db: DefDatabase | undefined
		if (!(db = this.databases.get(version)))
			return []

		return db.get(absPath)
	}
	// two strategies here
	// 1) we accept any global event, which is raised by Defs/**/*.xml watcher
	// 2) if the same file is watched textDocument, then previous event will be ignored
	// and we'll accept textDocument's event for a sync and incremental udpate
	listen (connection: IConnection): void {
		this.connection = connection
		connection.onNotification(DefFileAddedNotificationType, handler => {
			this.watchedFiles.add(handler.path)
		})
		connection.onNotification(DefFileChangedNotificationType, handler => {			
			const uri = URI.file(handler.path)
			if (this.textDocuments.get(uri.toString()) !== undefined)
				return

			this.update2(handler.path, handler.text)
		})
		connection.onNotification(DefFileRemovedNotificationType, path => {
			this.watchedFiles.delete(path)
		})
		this.textDocuments.listen(connection)
		this.textDocuments.onDidChangeContent(listener => {
			const text = listener.document.getText()
			const path = URI.parse(listener.document.uri).fsPath
			this.update2(path, text)
			// TODO - 데이터 채워넣기...
			this.onDocumentChanged?.(listener)
		})
	}

	private update2(path: absPath, content: string): void {
		const defs = getValidDefs(parse(content))
		this.update(path, defs)
	}

	private update(path: absPath, defs: def[]): void {
		let version: string | null
		if (!this.versionGetter || !(version = this.versionGetter(path)))
			return
		let db = this.databases.get(version)
		if (!db) {
			db = new DefDatabase(version)
			this.databases.set(version, db)
		}
		db.update(path, defs)
	}

	private async refreshDocuments() {
		if (!this.connection || !this.versionGetter)
			return
		
		const requestParams = [...this.watchedFiles.values()]
		const respond = await this.connection.sendRequest(TextReuqestType, requestParams)
		this.databases.clear()
		for (const res of respond) {
			const defs = getValidDefs(parse(res.text))
			if (defs)
				this.update(res.absPath, defs)
		}
	}
}

class DefDatabase {
	private _database: Map<absPath, def[]>
	constructor(readonly version: string) {
		this._database = new Map()
	}

	get(abspath: absPath): def[] {
		throw new Error()
	}

	update(abspath: absPath, defs: def[]): void {

	}

	private getKey(def: def): string {
		const key = `start:${def.start}-end:${def.end}`
		return key
	}
}