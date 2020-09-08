import { URILike } from '../../common/common'
import { def, getDefName, TypeInfoInjector, isTypeNode, getName } from '../../common/TypeInfo';
import { IConnection, TextDocuments } from 'vscode-languageserver';
import { Event } from '../../common/event'
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType, ReferencedDefFileAddedNotificationType } from '../../common/Defs';
import { parse, XMLDocument } from '../parser/XMLParser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { assert } from 'console';
import { typeDB } from '../typeDB';

type version = string;

export interface versionGetter {
	(path: URILike): version | undefined
}

export interface sourcedDef extends def {
	source: URILike
}

export interface VersionedTextDocument extends TextDocument {
	/** rimworld version where this TextDocument belongs to */
	rwVersion: string
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

// TODO - 레퍼런스 / 프로젝트 파일 구별하도록 해야함
// TODO - version parsing을 클라이언트 단에서 하도록 하자
// TODO - create event for doc add and re-evaluate all documents
// TODO - make a "dirty mark" for definitions and do a increment evaluation, instead of re-evaluate all
export class DefTextDocuments {
	private databases: Map<string, DefDatabase>
	/** URILike - text Set, it contain textDocuments which is watched */
	private watchedFiles: Map<URILike, TextDocument> // URILike - text
	private xmlDocuments: Map<URILike, XMLDocument>
	private readonly textDocuments: TextDocuments<TextDocument>
	/** @deprecated need to be removed */
	private versionGetter: versionGetter | undefined // fixme - remove this?
	onReferenceDocumentsAdded: Event<void>
	onDocumentAdded: Event<DefTextDocumentChangedEvent>
	onDocumentChanged: Event<DefTextDocumentChangedEvent> // event handler
	onDocumentDeleted: Event<URI>
	versionDB?: Map<string, typeDB>
	constructor() {
		this.databases = new Map()
		this.watchedFiles = new Map()
		this.textDocuments = new TextDocuments(TextDocument)
		this.xmlDocuments = new Map()
		this.onDocumentAdded = new Event()
		this.onDocumentChanged = new Event()
		this.onDocumentDeleted = new Event()
		this.onReferenceDocumentsAdded = new Event()
	}

	// needs refactor
	setVersionGetter(getter: versionGetter): void {
		this.versionGetter = getter
		this.databases.clear()
		this.refreshDocuments()
	}

	/**
	 * return opened / watched textDocument
	 * @param URILike string that can be parsed with URI.parse
	 */
	getDocument(URILike: URILike): TextDocument | undefined {
		return this.textDocuments.get(URILike) || this.watchedFiles.get(URILike)
	}

	getDocuments(): TextDocument[] {
		return [...this.watchedFiles.values()]
	}

	getXMLDocument(URILike: URILike): XMLDocument | undefined {
		return this.xmlDocuments.get(URILike)
	}

	getDefs(URILike: URILike): sourcedDef[] {
		let version: string | undefined
		if (!this.versionGetter || !(version = this.versionGetter(URILike)))
			return []

		let db: DefDatabase | undefined
		if (!(db = this.databases.get(version)))
			return []

		return db.get(URILike) as sourcedDef[] // we already injected values when we add data
	}

	/**
	 * returns defDatabase of matching version
	 * @param URILike uri string of the textDocument
	 */
	getDefDatabaseByUri(URILike: URILike): iDefDatabase | null {
		const version = this.versionGetter?.(URILike)
		if (version)
			return this.databases.get(version) || null
		return null
	}

	// two strategies here
	// 1) we accept any global event, which is raised by Defs/**/*.xml watcher
	// 2) if the same file is watched textDocument, then previous event will be ignored
	// and we'll accept textDocument's event for a sync and incremental udpate
	listen(connection: IConnection): void {
		connection.onNotification(DefFileAddedNotificationType, params => {
			for (const [path, text] of Object.entries(params.files)) {
				console.log(`defFileAddEvent ${path}`)
				const document = TextDocument.create(URI.parse(path).toString(), 'xml', 1, text)
				this.watchedFiles.set(path, document)
				this.update(params.version, path, text)
				this.onDocumentAdded?.Invoke({
					defs: this.getDefs(path),
					textDocument: document,
					xmlDocument: this.getXMLDocument(path)
				})
			}
		})
		connection.onNotification(DefFileChangedNotificationType, params => {
			console.log('defFileChangedNotification event')	 // FIXME - 이거 업데이트 안되는데?
			for (const [path, text] of Object.entries(params.files)) {
				// ignore if the document is managed by TextDocument (which is faster than node-watch)
				if (this.textDocuments.get(path) !== undefined)
					return

				const textDocument = TextDocument.create(path, 'xml', 1, text)
				this.watchedFiles.set(path, textDocument)
				this.update(params.version, path, text)

				this.onDocumentChanged?.Invoke({
					defs: this.getDefs(path),
					textDocument,
					xmlDocument: this.getXMLDocument(path)
				})
			}
		})
		connection.onNotification(DefFileRemovedNotificationType, path => {
			this.watchedFiles.delete(path)
			this.xmlDocuments.delete(path)
		})
		// 레퍼런스용 코드
		connection.onNotification(ReferencedDefFileAddedNotificationType, param => {
			console.log('ReferencedDefFileAddedNotificationType')
			for (const [path, text] of Object.entries(param.files)) {
				const document = TextDocument.create(path, 'xml', 1, text)
				this.watchedFiles.set(path, document)
				this.updateReference(param.version, path, document.getText())
			}
			this.onReferenceDocumentsAdded.Invoke()
		})

		this.textDocuments.listen(connection)
		this.textDocuments.onDidOpen(({ document }) => {
			console.log('textDocument.onDidOpen')
			this.watchedFiles.set(document.uri, document)
		})
		this.textDocuments.onDidChangeContent(({ document }) => {
			console.log('textDocuments/onDidChangeContent')
			const text = document.getText()
			const version = this.versionGetter?.(document.uri)
			if (version) {
				this.update(version, document.uri, text)
				// TODO - 데이터 채워넣기...
				this.onDocumentChanged.Invoke({
					defs: this.getDefs(document.uri),
					textDocument: document,
					xmlDocument: this.getXMLDocument(document.uri)
				})
			}
		})
	}

	/**
	 * clear internal documents.  
	 * should be only called when [ConfigChanged](#) event is raised.
	 */
	clear(): void {
		this.databases = new Map()
		this.watchedFiles = new Map()
		this.xmlDocuments = new Map()
	}

	private parseText(content: string, injector?: TypeInfoInjector): { xmlDocument: XMLDocument, defs: def[] } {
		const defs: def[] = []
		const parsed = parse(content)
		if (injector && parsed.root?.tag === 'Defs') {
			for (const node of parsed.root.children) {
				injector.Inject(node)
				if (isTypeNode(node))
					defs.push(node as def)
			}
		}
		return {
			xmlDocument: parsed,
			defs
		}
	}

	private GetOrCreateDB(version: string): DefDatabase {
		let db = this.databases.get(version)
		if (!db) {
			db = new DefDatabase(version)
			this.databases.set(version, db)
		}

		return db
	}

	private update(version: string, path: URILike, content: string): void {
		console.log('update')
		const db = this.GetOrCreateDB(version)
		const typeInfoInjector = this.versionDB?.get(version)?.injector
		const { defs, xmlDocument } = this.parseText(content, typeInfoInjector)
		this.xmlDocuments.set(path, xmlDocument)
		defs.map(def => Object.assign(def, { source: path }))
		db.update(path, defs)
	}

	private updateReference(version: version, path: URILike, content: string): void {
		const db = this.GetOrCreateDB(version)
		const typeInfoInjector = this.versionDB?.get(version)?.injector
		const { defs, xmlDocument } = this.parseText(content, typeInfoInjector)
		this.xmlDocuments.set(path, xmlDocument)
		defs.map(def => Object.assign(def, { source: path }))
		db.update(path, defs)
	}

	private async refreshDocuments() {
		// this.databases.clear()
		// for (const [key, textDocument] of this.watchedFiles.entries()) {
		// this.update(key, textDocument.getText())
		// }
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

export interface iDefDatabase {
	get(URIlike: URILike): def[]
	get2(defType: defType, name: string): def | null
	/**
	 * 
	 * @param defType defType string
	 */
	getDefs(defType: defType): def[]
	/** 
	 * returns Name candidate for inheritance
	 */
	getNames(): string[]
}

export class DefDatabase implements iDefDatabase {
	private _defs: Map<URILike, (referencedDef | def)[]>
	private _defDatabase: Map<defType, Map<defIdentifier, Set<(referencedDef | def)>>> // todo - 이거 리스트로 바꾸고 중복되는것도 담도록 하자
	private _NameDatabase: Map<string, Set<(referencedDef | def)>> // note that Name is global thing-y
	private _crossRefWanters: Set<referencedDef>
	constructor(readonly version: string) {
		this._defs = new Map()
		this._defDatabase = new Map()
		this._crossRefWanters = new Set()
		this._NameDatabase = new Map()
	}

	get(URILike: URILike): def[] { // only returns valid def
		return this._defs.get(URILike) || []
	}

	get2(defType: defType, name: string): def | null { // defName or Name property
		const defs = this._defDatabase.get(defType)?.get(name)
		if (defs) {
			const res = defs.values().next()
			return res.value || null
		}
		return null
	}

	getDefs(defType: defType): def[] {
		const map = this._defDatabase.get(defType)
		if (map) {
			/** collect all defs */
			const defs = [...map.values()].reduce((prev, curr) => {
				prev.push(...curr.values())
				return prev
			}, [] as def[])

			return defs
		}
		return []
	}

	getNames(): string[] {
		return [...this._NameDatabase.keys()]
	}

	update(URILike: URILike, newDefs: def[]): void {
		this.deleteDefs(URILike)
		for (const def of newDefs) {
			if (!def.tag || !def.closed)
				continue

			// FIXME - 이거 상속 아니어도 defDataBase는 만들어둬야할듯!!!
			const defType = def.tag // defType
			const defName = getDefName(def)
			if (defName && defType) {
				let map = this._defDatabase.get(defType)
				if (!map) {
					map = new Map()
					this._defDatabase.set(defType, map)
				}

				let map2 = map.get(defName)
				if (!map2) {
					map2 = new Set()
					map.set(defName, map2)
				}
				assert(!map2.has(def), 'unexpected: def is already registered') // is it necessary?
				map2.add(def)
			}

			const Name = getName(def)
			if (Name) {
				let set = this._NameDatabase.get(Name)
				if (!set) {
					set = new Set()
					this._NameDatabase.set(Name, set)
				}
				set.add(def) // it shouldn't make any errors
			}

			if (def.attributes?.ParentName)
				this.registerCrossRefWanter(def)
		}

		this.resolveCrossRefWanters()
		this._defs.set(URILike, newDefs)
	}

	private resolveCrossRefWanters(): void {
		for (const def of this._crossRefWanters.values()) {
			const ParentName = def.attributes?.ParentName
			if (ParentName) {
				const baseDefs = this._NameDatabase.get(ParentName)
				if (baseDefs) {
					for (const baseDef of baseDefs) {
						if (!isReferencedDef(baseDef)) {
							Object.assign(baseDef, { derived: new Set() })
						}
						const set = (<referencedDef>baseDef).derived
						set.add(def)
						def.base = <referencedDef>baseDef
						this._crossRefWanters.delete(def)
					}
				}
			}
			/*
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
			*/
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
				const map = this._defDatabase.get(def.tag)
				if (map) {
					const defName = getDefName(def)
					if (defName) {
						map.delete(defName)
						if (map.size == 0)
							this._defDatabase.delete(def.tag)
					}
				}

				if (isReferencedDef(def)) {
					this.disconnectReferences(def)
					// remove references
					this._crossRefWanters.delete(def)

					const Name = getName(def)
					if (Name) {
						const set = this._NameDatabase.get(Name)
						if (set) {
							set.delete(def)
							if (set.size == 0) {
								this._NameDatabase.delete(Name)
							}
						}
					}

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