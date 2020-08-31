import { URILike } from '../../common/common'
import { def, getDefIdentifier, TypeInfoInjector, isTypeNode } from './TypeInfo';
import { IConnection, TextDocuments } from 'vscode-languageserver';
import { Event } from '../../common/event'
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType } from '../../common/Defs';
import { parse, XMLDocument } from '../parser/XMLParser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { RWTextDocument } from '../documents';
import { assert } from 'console';

type version = string;

export interface versionGetter {
	(path: URILike): version | null
}

export interface DocumentChangedHandler {
	(change: RWTextDocument): void
}

export interface sourcedDef extends def {
	source: URILike
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
	/** URILike - text Set, it contain textDocuments which is watched */
	private watchedFiles: Map<URILike, TextDocument> // URILike - text
	private xmlDocuments: Map<URILike, XMLDocument>
	private readonly textDocuments: TextDocuments<RWTextDocument>
	private versionGetter: versionGetter | undefined
	onDocumentAdded: Event<DefTextDocumentChangedEvent>
	onDocumentChanged: Event<DefTextDocumentChangedEvent> // event handler
	onDocumentDeleted: Event<URI>
	typeInjector?: TypeInfoInjector
	constructor() {
		this.databases = new Map()
		this.watchedFiles = new Map()
		this.textDocuments = new TextDocuments(TextDocument)
		this.xmlDocuments = new Map()
		this.onDocumentAdded = new Event()
		this.onDocumentChanged = new Event()
		this.onDocumentDeleted = new Event()
	}

	// needs refactor
	setVersionGetter (getter: versionGetter): void {
		this.versionGetter = getter
		this.databases.clear()
		this.refreshDocuments()
	}

	/**
	 * return opened / watched textDocument
	 * @param URILike string that can be parsed with URI.parse
	 */
	getDocument (URILike: URILike): TextDocument | undefined {
		return this.textDocuments.get(URILike) || this.watchedFiles.get(URILike)
	}

	getXMLDocument (URILike: URILike): XMLDocument | undefined { 
		return this.xmlDocuments.get(URILike)
	}

	getDefs (URILike: URILike): sourcedDef[] {
		let version: string | null
		if (!this.versionGetter || !(version = this.versionGetter(URILike)))
			return []
		
		let db: DefDatabase | undefined
		if (!(db = this.databases.get(version)))
			return []

		return db.get(URILike) as sourcedDef[] // we already injected values when we add data
	}

	// two strategies here
	// 1) we accept any global event, which is raised by Defs/**/*.xml watcher
	// 2) if the same file is watched textDocument, then previous event will be ignored
	// and we'll accept textDocument's event for a sync and incremental udpate
	listen (connection: IConnection): void {
		connection.onNotification(DefFileAddedNotificationType, handler => {
			const document = TextDocument.create(URI.file(handler.path).toString(), 'xml', 1, handler.text)
			this.watchedFiles.set(handler.path, document)
			this.update(handler.path, handler.text)
			this.onDocumentAdded?.Invoke({
				defs: this.getDefs(handler.path),
				textDocument: document,
				xmlDocument: this.getXMLDocument(handler.path)
			})
		})
		connection.onNotification(DefFileChangedNotificationType, handler => {		
			// console.log('defFileChangedNotification event')	 // FIXME - 이거 업데이트 안되는데?
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
		this.textDocuments.onDidOpen(({ document }) => {
			this.watchedFiles.set(document.uri, document)
		})
		this.textDocuments.onDidChangeContent(({ document }) => {
			// console.log('onDidChangeContent event')
			const text = document.getText()
			this.update(document.uri, text)
			// TODO - 데이터 채워넣기...
			this.onDocumentChanged?.Invoke({
				defs: this.getDefs(document.uri),
				textDocument: document,
				xmlDocument: this.getXMLDocument(document.uri)
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

	private update(path: URILike, content: string): void {
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
	private update2(path: URILike, content: string): void {
		const defs = this.parseText(content)
		this.update(path, defs)
	}
	*/

	/*
	private update(path: URILike, defs: def[]): void {
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
	private _defs: Map<URILike, (referencedDef | def)[]>
	private _defDatabase: Map<defType, Map<defIdentifier, (referencedDef | def)>>
	private _crossRefWanters: Set<referencedDef>
	constructor(readonly version: string) {
		this._defs = new Map()
		this._defDatabase = new Map()
		this._crossRefWanters = new Set()
	}

	get(URILike: URILike): def[] { // only returns valid def
		return this._defs.get(URILike) || []
	}

	get2(defType: defType, name: string): def | null { // defName or Name property
		return this._defDatabase.get(defType)?.get(name) || null
	}

	update(URILike: URILike, newDefs: def[]): void {
		this.deleteDefs(URILike)
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
		this._defs.set(URILike, newDefs)
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

	private deleteDefs(URILike: URILike): void {
		const defs = this._defs.get(URILike)
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
			this._defs.delete(URILike)
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