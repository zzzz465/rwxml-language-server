import { URILike } from '../../common/common'
import { def, getDefName, TypeInfoInjector, isTypeNode, getName } from './TypeInfo';
import { IConnection, TextDocuments } from 'vscode-languageserver';
import { Event } from '../../common/event'
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType, ReferencedDefFileAddedNotificationType } from '../../common/Defs';
import { parse, XMLDocument } from '../parser/XMLParser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { assert } from 'console';

type version = string;

export interface versionGetter {
	(path: URILike): version | null
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

// TODO - 레퍼런스 / 프로젝트 파일 구별하도록 해야함

export class DefTextDocuments {
	private databases: Map<string, DefDatabase>
	/** URILike - text Set, it contain textDocuments which is watched */
	private watchedFiles: Map<URILike, TextDocument> // URILike - text
	private xmlDocuments: Map<URILike, XMLDocument>
	private readonly textDocuments: TextDocuments<TextDocument>
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
		connection.onNotification(DefFileAddedNotificationType, params => {
			console.log(`defFileAddEvent ${params.path}`)
			const document = TextDocument.create(URI.parse(params.path).toString(), 'xml', 1, params.text)
			this.watchedFiles.set(params.path, document)
			this.update(params.path, params.text)
			this.onDocumentAdded?.Invoke({
				defs: this.getDefs(params.path),
				textDocument: document,
				xmlDocument: this.getXMLDocument(params.path)
			})
		})
		connection.onNotification(DefFileChangedNotificationType, params => {		
			// console.log('defFileChangedNotification event')	 // FIXME - 이거 업데이트 안되는데?
			const uri = URI.parse(params.path)
			// textDocuments 에 의하여 업데이트 될 경우, 무시
			if (this.textDocuments.get(uri.toString()) !== undefined)
				return

			this.watchedFiles.set(params.path, 
				TextDocument.create(URI.file(params.path).toString(), 'xml', 1, params.text))
			this.update(params.path, params.text)
		})
		connection.onNotification(DefFileRemovedNotificationType, path => {
			this.watchedFiles.delete(path)
			this.xmlDocuments.delete(path)
		})
		// 레퍼런스용 코드
		connection.onNotification(ReferencedDefFileAddedNotificationType, params => {
			console.log(`refDefAdd ${params.path}`)
			const document = TextDocument.create(URI.parse(params.path).toString(), 'xml', 1, params.text)
			this.watchedFiles.set(params.path, document)
			this.updateReference(params.path, params.text)
			this.onDocumentAdded?.Invoke({
				defs: this.getDefs(params.path),
				textDocument: document,
				xmlDocument: this.getXMLDocument(params.path)
			})
		})
		this.textDocuments.listen(connection)
		this.textDocuments.onDidOpen(({ document }) => {
			this.watchedFiles.set(document.uri, document)
		})
		this.textDocuments.onDidChangeContent(({ document }) => {
			console.log('textDocuments/onDidChangeContent')
			const text = document.getText()
			this.update(document.uri, text)
			// TODO - 데이터 채워넣기...
			this.onDocumentChanged.Invoke({
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
		console.log('update')
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

	// 레퍼런스용 노드는 공용 노드로 인식해야함, 즉 모든 버전에 추가되어야 함
	private updateReference (path: URILike, content: string): void {
		/*
		const { defs, xmlDocument } = this.parseText(content)
		this.xmlDocuments.set(path, xmlDocument)
		defs.map(def => Object.assign(def, { source: path }))
		for (const [version, db] of this.databases.entries()) {
			db.update(path, defs)
		}
		*/
	}

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
	private _defDatabase: Map<defType, Map<defIdentifier, (referencedDef | def)>> // todo - 이거 리스트로 바꾸고 중복되는것도 담도록 하자
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
		return this._defDatabase.get(defType)?.get(name) || null
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
				map.set(defName, def)
			}

			const Name = getName(def)
			if (Name) {
				if (!this._NameDatabase.has(Name))
					this._NameDatabase.set(Name, new Set())
				this._NameDatabase.get(Name)!.add(def) // it shouldn't make any errors
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
						assert(!def.base, 'trying to add parent to def which is already have a reference')
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
				if (isReferencedDef(def)) {
					this._defDatabase.get(def.tag)?.delete(getDefName(def)!) // possible runtime err
					this.disconnectReferences(def)
					// remove references
					this._crossRefWanters.delete(def)
					
					const Name = getName(def)
					if (Name)
						this._NameDatabase.get(Name)?.delete(def)

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