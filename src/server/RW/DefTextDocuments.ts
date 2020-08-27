import { absPath, TextReuqestType } from '../../common/common'
import { def, getDefIdentifier, TypeInfoInjector, isTypeNode } from './TypeInfo';
import { IConnection, Connection, TextDocuments, TextDocumentChangeEvent } from 'vscode-languageserver';
import { Event } from '../../common/event'
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType } from '../../common/Defs';
import { parse, XMLDocument } from '../parser/XMLParser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { RWTextDocument } from '../documents';
import { assert } from 'console';

type version = string;

export interface versionGetter {
	(path: absPath): version | null
}

export interface DocumentChangedHandler {
	(change: RWTextDocument): void
}

export interface sourcedDef extends def {
	source: absPath
}

export function isSourcedDef(obj: any): obj is sourcedDef {
	return 'source' in obj && typeof obj.source === 'string'
}
export interface DefTextDocumentChangedEvent {
	textDocument: TextDocument
	/** parsed textDocument to the XMLDocument */
	xmlDocument?: XMLDocument
	/** parsed defs within corresponding xmlDocument */
	defs: sourcedDef[]
}

export class DefTextDocuments {
	private databases: Map<string, DefDatabase>
	private watchedFiles: Map<absPath, TextDocument> // absPath - text
	private xmlDocuments: Map<absPath, XMLDocument>
	private readonly textDocuments: TextDocuments<RWTextDocument>
	private versionGetter: versionGetter | undefined
	private connection: Connection | undefined
	onDocumentAdded?: Event<DefTextDocumentChangedEvent>
	onDocumentChanged?: Event<DefTextDocumentChangedEvent> // event handler
	onDocumentDeleted?: Event<URI>
	typeInjector?: TypeInfoInjector
	constructor() {
		this.databases = new Map()
		this.watchedFiles = new Map()
		this.textDocuments = new TextDocuments(TextDocument)
		this.xmlDocuments = new Map()
	}

	// needs refactor
	setVersionGetter (getter: versionGetter): void {
		this.versionGetter = getter
		this.databases.clear()
		this.refreshDocuments()
	}

	getDocument (absPath: absPath): TextDocument | undefined {
		return this.watchedFiles.get(absPath)
	}

	getXMLDocument (absPath: absPath): XMLDocument | undefined { 
		return this.xmlDocuments.get(absPath)
	}

	getDefs (absPath: absPath): sourcedDef[] {
		let version: string | null
		if (!this.versionGetter || !(version = this.versionGetter(absPath)))
			return []
		
		let db: DefDatabase | undefined
		if (!(db = this.databases.get(version)))
			return []

		return db.get(absPath) as sourcedDef[] // we already injected values when we add data
	}

	// two strategies here
	// 1) we accept any global event, which is raised by Defs/**/*.xml watcher
	// 2) if the same file is watched textDocument, then previous event will be ignored
	// and we'll accept textDocument's event for a sync and incremental udpate
	listen (connection: IConnection): void {
		this.connection = connection
		connection.onNotification(DefFileAddedNotificationType, handler => {
			const document = TextDocument.create(URI.file(handler.path).toString(), 'xml', 1, handler.text)
			this.watchedFiles.set(handler.path, document)
			this.update(handler.path, handler.text)
			this.onDocumentAdded?.({
				defs: this.getDefs(handler.path),
				textDocument: document,
				xmlDocument: this.getXMLDocument(handler.path)
			})
		})
		connection.onNotification(DefFileChangedNotificationType, handler => {			
			const uri = URI.file(handler.path)
			// textDocuments 에 의하여 업데이트 될 경우, 무시
			if (this.textDocuments.get(uri.toString()) !== undefined)
				return

			this.watchedFiles.set(handler.path, 
				TextDocument.create(URI.file(handler.path).toString(), 'xml', 1, handler.text))
			this.update(handler.path, handler.text)
		})
		connection.onNotification(DefFileRemovedNotificationType, path => {
			this.watchedFiles.delete(path)
			this.xmlDocuments.delete(path)
		})
		this.textDocuments.listen(connection)
		this.textDocuments.onDidOpen(listener => {
			const document = listener.document
			const fsPath = URI.parse(document.uri).fsPath
			this.watchedFiles.set(fsPath, document)
		})
		this.textDocuments.onDidChangeContent(listener => {
			const text = listener.document.getText()
			const path = URI.parse(listener.document.uri).fsPath
			this.update(path, text)
			// TODO - 데이터 채워넣기...
			this.onDocumentChanged?.({
				defs: this.getDefs(path),
				textDocument: listener.document,
				xmlDocument: this.getXMLDocument(path)
			})
		})
	}

	private parseText(content: string): { xmlDocument: XMLDocument, defs: def[] } {
		const defs: def[] = []
		const parsed = parse(content)
		if (this.typeInjector && parsed.root?.tag === 'Defs') {
			for (const node of parsed.root.children) {
				this.typeInjector.Inject(node)
				if (isTypeNode(node))
					defs.push(node as def)
			}
		}
		return {
			xmlDocument: parsed,
			defs
		}
	}

	private update(path: absPath, content: string): void {
		if (this.versionGetter && this.typeInjector) {
			const version = this.versionGetter(path)
			if (version) {
				let db = this.databases.get(version)
				if (!db) {
					db = new DefDatabase(version)
					this.databases.set(version, db)
				}
				const { defs, xmlDocument } = this.parseText(content)
				this.xmlDocuments.set(path, xmlDocument)
				defs.map(def => Object.assign(def, { source: path }))
				db.update(path, defs)
			}
		}
	}
	/*
	private update2(path: absPath, content: string): void {
		const defs = this.parseText(content)
		this.update(path, defs)
	}
	*/

	/*
	private update(path: absPath, defs: def[]): void {
		let version: string | null
		if (!this.versionGetter || !(version = this.versionGetter(path)))
			return
		let db = this.databases.get(version)
		if (!db) {
			db = new DefDatabase(version)
			this.databases.set(version, db)
		}
		defs.map(def => Object.assign(def, { source: path })) // inject source field into def object
		db.update(path, defs)
	}
	*/

	private async refreshDocuments() {
		this.databases.clear()
		for (const [key, textDocument] of this.watchedFiles.entries()) {
			this.update(key, textDocument.getText())
		}
	}
}

type defKey = string
type defIdentifier = string
type defType = string

interface defCrossReference {
	base?: referencedDef
	derived: Set<referencedDef>
}

export type referencedDef = defCrossReference & def
export function isReferencedDef(obj: any): obj is referencedDef {
	return 'derived' in obj
}

class DefDatabase {
	private _defs: Map<absPath, (referencedDef | def)[]>
	private _defDatabase: Map<defType, Map<defIdentifier, (referencedDef | def)>>
	private _crossRefWanters: Set<referencedDef>
	constructor(readonly version: string) {
		this._defs = new Map()
		this._defDatabase = new Map()
		this._crossRefWanters = new Set()
	}

	get(abspath: absPath): def[] { // only returns valid def
		return this._defs.get(abspath) || []
	}

	get2(defType: defType, name: string): def | null { // defName or Name property
		return this._defDatabase.get(defType)?.get(name) || null
	}

	update(abspath: absPath, newDefs: def[]): void {
		this.deleteDefs(abspath)
		for (const def of newDefs) {
			if (!def.tag || !def.closed)
				continue

			const defType = def.tag // defType
			const identifier = getDefIdentifier(def)
			if (identifier && defType) {
				let map = this._defDatabase.get(defType)
				if (!map) {
					map = new Map()
					this._defDatabase.set(defType, map)
				}
				map.set(identifier, def)
			}

			if (def.attributes?.ParentName)
				this.registerCrossRefWanter(def)
		}

		this.resolveCrossRefWanters()
		this._defs.set(abspath, newDefs)
	}

	private resolveCrossRefWanters(): void {
		for (const def of this._crossRefWanters.values()) {
			const map = this._defDatabase.get(def.tag)
			if (map) {
				const ParentName = def.attributes?.ParentName
				if (ParentName) {
					const baseDef = map.get(ParentName)
					if (baseDef) {
						if (!isReferencedDef(baseDef)) {
							Object.assign(baseDef, { derived: new Set() })
						}
						const set = (<referencedDef>baseDef).derived
						set.add(def)
						assert(!def.base, 'trying to add parent to def which is already have a reference')
						def.base = <referencedDef>baseDef
						this._crossRefWanters.delete(def)
					}
				}
			}
		}
	}

	private registerCrossRefWanter(def: def | referencedDef): void {
		if (!isReferencedDef(def))
			def = Object.assign(def, { derived: new Set() })
		this._crossRefWanters.add(<referencedDef>def)
	}

	private deleteDefs(absPath: absPath): void {
		const defs = this._defs.get(absPath)
		if (defs) {
			for (const def of defs) {
				if (isReferencedDef(def)) {
					this._defDatabase.get(def.tag)?.delete(getDefIdentifier(def)!) // possible runtime err
					this.disconnectReferences(def)
					// remove references
					this._crossRefWanters.delete(def)
					delete def.base, def.derived
				}
			}
			this._defs.delete(absPath)
		}
	}

	private disconnectReferences(def: referencedDef): void {
		if (def.base) // remove cross-reference with parent
			assert(def.base.derived.delete(def), 
				`tried to remove parent reference ${def.tag} which is not valid`)

		for (const derived of def.derived.values()) { // remove cross-reference with child
			assert(derived.base === def)
			derived.base = undefined
			this.registerCrossRefWanter(derived)
		}
	}

	// private getKey(def: def): string {
		// const key = `start:${def.start}-end:${def.end}`
		// return key
	// }
}