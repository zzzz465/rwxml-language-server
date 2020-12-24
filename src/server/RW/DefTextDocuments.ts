/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-namespace */
import { URILike } from '../../common/common'
import { def, getDefName, TypeInfoInjector, isTypeNode, getName, typeNode } from '../../common/TypeInfo';
import { IConnection, TextDocuments } from 'vscode-languageserver';
import { Event, iEvent } from '../../common/event'
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType, ReferencedDefFileAddedNotificationType } from '../../common/Defs';
import { Node, parse, XMLDocument } from '../parser/XMLParser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { assert } from 'console';
import { versionDB } from '../versionDB';
import { ConfigDatum, getVersion } from '../../common/config';
import { BFS } from '../utils/nodes';

type version = string;

export interface versionGetter {
	(path: URILike): version | undefined
}

export interface sourcedDef extends def {
	source: URILike
}

export interface DefTextDocument extends TextDocument {
	/** rimworld version where this TextDocument belongs to */
	rwVersion: string // cannot use version which is already used in TextDocument interface
	isReferencedDocument?: boolean
}

function isDefTextDocument(document: TextDocument): document is DefTextDocument {
	return 'rwVersion' in document && !!(<any>document).rwVersion
}

function convertToDefTextdocument(doc: TextDocument, version: string, isReferencedDocument?: boolean): DefTextDocument {
	return Object.assign(doc, { rwVersion: version, isReferencedDocument })
}

export function isSourcedDef(obj: any): obj is sourcedDef {
	return 'source' in obj && typeof obj.source === 'string'
}

export interface DefTextDocumentChangedEvent {
	textDocument: DefTextDocument
	/** parsed textDocument to the XMLDocument */
	xmlDocument?: XMLDocument
	/** parsed defs within corresponding xmlDocument */
	defs: sourcedDef[]
}

interface DirtyNodeOccurEvent {
	dirtyNodes: Set<DirtyNode>
}

interface getVersion {
	(uri: string): string | undefined
}

interface getVersionDB {
	(version: string): versionDB | undefined
}

/*
1) TextDocuments에서 onAdd일경우, watch보다 빠름 -> 경로를 모름
1-1) 값을 서치해서, 찾도록 할까?
1-2) Thenable로 기다리게 하면.. 복잡하다... X
2) TextDocuments에서 onChange일 경우, 이미 registered일수도 있고, 아닐수도 있음
2-1) registered 일 경우 -> 기존 path 재활용 하면 문제가 생기진 않나? 안생길듯
2-2) unregistered 일 경우 -> 1-1) 과 동일하다
3) 그냥 textDocuments 쓰지말고, 내가 따로 implementation 해버릴까?
이게 가장 나은거같은데?

TextDocument versioning을 해야하는데... given 에서는 version이 없음
그냥 이것도 같이 줄까?
*/

// TODO - 레퍼런스 / 프로젝트 파일 구별하도록 해야함
// TODO - version parsing을 클라이언트 단에서 하도록 하자
// TODO - create event for doc add and re-evaluate all documents
// TODO - make a "dirty mark" for definitions and do a increment evaluation, instead of re-evaluate all
export class DefTextDocuments {
	private databases: Map<string, DefDatabase>
	/** URILike - text map */
	private defDocuments: Map<URILike, DefTextDocument> // URILike - text
	private editorDocuments: Map<URILike, TextDocument>
	private xmlDocuments: Map<URILike, XMLDocument>
	// private readonly textDocuments: TextDocuments<TextDocument>
	private _onReferenceDocumentsAdded: Event<DirtyNodeOccurEvent>
	get onReferenceDocumentsAdded(): iEvent<DirtyNodeOccurEvent> { return this._onReferenceDocumentsAdded }
	private _onDocumentAdded: Event<DefTextDocumentChangedEvent & DirtyNodeOccurEvent>
	get onDocumentAdded(): iEvent<DefTextDocumentChangedEvent & DirtyNodeOccurEvent> { return this._onDocumentAdded }
	private _onDocumentChanged: Event<DefTextDocumentChangedEvent & DirtyNodeOccurEvent> // event handler
	get onDocumentChanged(): iEvent<DefTextDocumentChangedEvent & DirtyNodeOccurEvent> { return this._onDocumentChanged }
	private _onDocumentDeleted: Event<{ Uri: URILike } & DirtyNodeOccurEvent>
	get onDocumentDeleted(): iEvent<{ Uri: URILike } & DirtyNodeOccurEvent> { return this._onDocumentDeleted }
	getVersionDB: getVersionDB
	getVersion: getVersion // DI

	constructor() {
		this.databases = new Map()
		this.defDocuments = new Map()
		// this.textDocuments = new TextDocuments(TextDocument)
		this.xmlDocuments = new Map()
		this._onDocumentAdded = new Event()
		this._onDocumentChanged = new Event()
		this._onDocumentDeleted = new Event()
		this._onReferenceDocumentsAdded = new Event()
		this.editorDocuments = new Map()
		this.getVersion = () => undefined
		this.getVersionDB = () => undefined
	}

	/**
	 * return opened / watched textDocument
	 * @param URILike string that can be parsed with URI.parse
	 */
	getDocument(URILike: URILike): DefTextDocument | undefined {
		const doc = this.editorDocuments.get(URILike)
		if (doc && isDefTextDocument(doc))
			return doc

		return this.defDocuments.get(URILike)
	}

	getDocuments(): DefTextDocument[] {
		return [...this.defDocuments.values()]
	}

	getXMLDocument(URILike: URILike): XMLDocument | undefined {
		return this.xmlDocuments.get(URILike)
	}

	getDefs(URILike: URILike): sourcedDef[] {
		const version = this.getVersion(URILike)
		if (version) {
			const db = this.databases.get(version)
			if (db) {
				db.getByURI(URILike) as sourcedDef[] // we already injected values when we add data
			}
		}
		return []
	}

	/**
	 * returns defDatabase of matching version
	 * @param URILike uri string of the textDocument
	 */
	getDefDatabaseByUri(URILike: URILike): iDefDatabase | undefined {
		const version = this.getVersion(URILike)
		if (version) {
			return this.databases.get(version)
		}
	}

	// two strategies here
	// 1) we accept any global event, which is raised by Defs/**/*.xml watcher
	// 2) if the same file is watched textDocument, then previous event will be ignored
	// and we'll accept textDocument's event for a sync and incremental udpate
	listen(connection: IConnection): void {
		connection.onNotification(DefFileAddedNotificationType, params => {
			for (const [path, text] of Object.entries(params.files)) {
				const document = convertToDefTextdocument(
					TextDocument.create(URI.parse(path).toString(), 'xml', 1, text),
					params.version)
				this.defDocuments.set(path, document)
				const dirtyNodes = this.update(params.version, path, text)
				this._onDocumentAdded?.Invoke({
					defs: this.getDefs(path),
					textDocument: document,
					xmlDocument: this.getXMLDocument(path),
					dirtyNodes
				})
			}
		})
		connection.onNotification(DefFileChangedNotificationType, params => {
			console.log('defFileChangedNotification event')	 // FIXME - 이거 업데이트 안되는데?
			for (const [path, text] of Object.entries(params.files)) {
				if (this.editorDocuments.has(path))
					continue

				const textDocument = convertToDefTextdocument(
					TextDocument.create(path, 'xml', 1, text),
					params.version)
				this.defDocuments.set(path, textDocument)
				const dirtyNodes = this.update(params.version, path, text)

				this._onDocumentChanged?.Invoke({
					defs: this.getDefs(path),
					textDocument,
					xmlDocument: this.getXMLDocument(path),
					dirtyNodes
				})
			}
		})
		connection.onNotification(DefFileRemovedNotificationType, path => {
			const version = this.getVersion(path)
			if (version) {
				const dirtyNodes = this.GetOrCreateDB(version).delete(path)
				this._onDocumentDeleted.Invoke({ Uri: path, dirtyNodes })
			}
		})

		connection.onNotification(DefFileRemovedNotificationType, path => {
			this.defDocuments.delete(path)
			this.xmlDocuments.delete(path)
		})
		// 레퍼런스용 코드
		connection.onNotification(ReferencedDefFileAddedNotificationType, param => {
			const dirtyNodes = new Set<DirtyNode>()
			for (const [path, text] of Object.entries(param.files)) {
				const document = convertToDefTextdocument(
					TextDocument.create(path, 'xml', 1, text),
					param.version, true)
				this.defDocuments.set(path, document)
				this.updateReference(param.version, path, document.getText())
					.forEach(node => dirtyNodes.add(node))
			}
			this._onReferenceDocumentsAdded.Invoke({ dirtyNodes })
		})

		connection.onDidOpenTextDocument(({ textDocument }) => {
			const version = this.getVersion(textDocument.uri)
			const document = TextDocument.create(textDocument.uri, textDocument.languageId, textDocument.version, textDocument.text)
			if (version) {
				const document = convertToDefTextdocument(
					TextDocument.create(textDocument.uri, textDocument.languageId, textDocument.version, textDocument.text),
					version)

				this.defDocuments.set(document.uri, document)
			}

			this.editorDocuments.set(document.uri, document)
		})

		connection.onDidChangeTextDocument(({ contentChanges, textDocument }) => {
			const document = this.editorDocuments.get(textDocument.uri)!
			assert(document, 'unexpected: document is null in connection: onDidChangeTextDocument event')
			TextDocument.update(document, contentChanges, document.version + 1)

			if (!isDefTextDocument(document)) {
				const version = this.getVersion(document.uri)
				if (version) {
					const doc = Object.assign(document, { rwVersion: version } as DefTextDocument)
					this.defDocuments.set(document.uri, doc)
					const dirtyNodes = this.update(doc.rwVersion, doc.uri, doc.getText())
					this._onDocumentChanged.Invoke({
						defs: this.getDefs(document.uri),
						textDocument: doc,
						xmlDocument: this.getXMLDocument(document.uri),
						dirtyNodes
					})
				}
			} else {
				this.defDocuments.set(document.uri, document)
				const dirtyNodes = this.update(document.rwVersion, document.uri, document.getText())
				this._onDocumentChanged.Invoke({
					defs: this.getDefs(document.uri),
					textDocument: document,
					xmlDocument: this.getXMLDocument(document.uri),
					dirtyNodes
				})
			}
		})

		connection.onDidCloseTextDocument(({ textDocument: { uri } }) => {
			assert(this.editorDocuments.delete(uri), `unexpected: ${uri} was not in editorDocuments`)
		})
	}

	/**
	 * clear internal documents.  
	 * should be only called when [ConfigChanged](#) event is raised.
	 */
	clear(): void {
		this.databases = new Map()
		this.defDocuments = new Map()
		this.xmlDocuments = new Map()
	}

	private parseText(content: string, injector?: TypeInfoInjector): { xmlDocument: XMLDocument, defs: def[] } {
		const defs: def[] = []
		const parsed = parse(content)
		if (injector && parsed.root?.tag?.content === 'Defs') {
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

	private update(version: string, path: URILike, content: string): Set<DirtyNode> {
		const db = this.GetOrCreateDB(version)
		const typeInfoInjector = this.getVersionDB(version)?.injector
		const { defs, xmlDocument } = this.parseText(content, typeInfoInjector)
		this.xmlDocuments.set(path, xmlDocument)
		defs.map(def => Object.assign(def, { source: path }))
		return db.update(path, defs)
	}

	// TODO - merge with update maybe??
	private updateReference(version: version, path: URILike, content: string): Set<DirtyNode> {
		const db = this.GetOrCreateDB(version)
		const typeInfoInjector = this.getVersionDB(version)?.injector
		const { defs, xmlDocument } = this.parseText(content, typeInfoInjector)
		this.xmlDocuments.set(path, xmlDocument)
		defs.map(def => Object.assign(def, { source: path }))
		return db.update(path, defs)
	}
}

/** defName */
type defName = string
type defType = string

interface iInherit {
	base?: InheritDef
	derived: Set<InheritDef>
}

interface iWeakRef {
	weakReference: {
		/** set of nodes which is pointing this node */
		in: Set<WeakRefNode>
		/** set of nodes that this node is pointing */
		out: Set<WeakRefNode>
	}
}

export namespace WeakRefNode {
	export function toString(obj: WeakRefNode): string {
		return `out: ${obj.weakReference.out.size}, in: ${obj.weakReference.in.size}`
	}
}

export function isWeakRefNode(node: Node): node is WeakRefNode {
	if (!isTypeNode(node))
		return false

	if ('weakReference' in node) {
		const weakRef = (<any>node).weakReference
		return 'in' in weakRef && 'out' in weakRef
	} else {
		return false
	}
}

/** def that have relations with inheritance */
export type InheritDef = iInherit & def
/** def that have in-out reference */
export type WeakRefNode = iWeakRef & typeNode
export function isReferencedDef(obj: any): obj is InheritDef {
	return 'derived' in obj
}

interface iDirtyNode {
	dirtyStage: 'dirty' | 'handled'
}

export function isDirtyNode(obj: Node): obj is DirtyNode {
	return 'dirtyStage' in obj
}

function castOrConvertToDirtyNode(node: typeNode): DirtyNode {
	if (!isDirtyNode(node))
		return Object.assign(node, { dirtyStage: 'dirty' } as iDirtyNode)
	else
		return node
}

/** typenode which need to be re-evaluated */
export type DirtyNode = iDirtyNode & typeNode

export interface iDefDatabase {
	getByURI(URIlike: URILike): def[]
	getByName(defType: defType, name: string): def | null
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

// TODO - add weakReference

export class DefDatabase implements iDefDatabase {
	private _defs: Map<URILike, (InheritDef | def)[]>
	private _defDatabase: Map<defType, Map<defName, Set<(InheritDef | def)>>>
	private _NameDatabase: Map<string, Set<(InheritDef | def)>> // note that Name is global thing-y
	private _inheritWanters: Set<InheritDef>
	private _weakDefRefWanters: Set<WeakRefNode>
	constructor(readonly version: string) {
		this._defs = new Map()
		this._defDatabase = new Map()
		this._inheritWanters = new Set()
		this._NameDatabase = new Map()
		this._weakDefRefWanters = new Set()
	}

	getByURI(URILike: URILike): def[] { // only returns valid def
		return this._defs.get(URILike) || []
	}

	getByName(defType: defType, name: string): def | null { // defName or Name property
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

	/**
	 * update defDatabase, returning dirty nodes which need to be re-evaluated
	 * @param URILike 
	 * @param newDefs 
	 * @returns dirty nodes which need to be re-evaluated
	 */
	update(URILike: URILike, newDefs: def[]): Set<DirtyNode> {
		this.deleteDefs(URILike)
		for (const def of newDefs) {
			if (!def.tag || !def.closed)
				continue

			// FIXME - 이거 상속 아니어도 defDataBase는 만들어둬야할듯!!!
			const defType = def.tag.content // defType
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
				this.registerInheritWanter(def)

			const weakRefWanters = BFS(def).filter<typeNode>(isTypeNode)
				.filter(node => node.typeInfo.specialType?.defType && node.text)
			weakRefWanters.map(node => this.registerWeakRefWanter(node))
		}

		this._defs.set(URILike, newDefs)
		const dirty1 = this.resolveInheritWanters()
		const dirty2 = this.resolveWeakRefWanters()
		// merging two sets
		for (const val of dirty2)
			dirty1.add(val)

		return dirty1
	}

	/** delete file from defDatabase
	 *  
	 * */
	delete(URILike: URILike): Set<DirtyNode> {
		const result = this.update(URILike, [])
		this._defs.delete(URILike)
		return result
	}

	/** resolve inheritance interanlly
	 * @returns dirty nodes which need to be re-evaluated
	 */
	private resolveInheritWanters(): Set<DirtyNode> {
		const dirtyNodes: Set<DirtyNode> = new Set()
		for (const def of this._inheritWanters.values()) {
			const ParentName = def.attributes?.ParentName
			if (ParentName) {
				const baseDefs = this._NameDatabase.get(ParentName)
				if (baseDefs) {
					for (const baseDef of baseDefs) {
						if (!isReferencedDef(baseDef)) {
							const inherit: iInherit = { derived: new Set() }
							Object.assign(baseDef, inherit)
						}
						const baseDef2 = baseDef as InheritDef
						const set = baseDef2.derived
						set.add(def)
						def.base = <InheritDef>baseDef
						this._inheritWanters.delete(def)

						dirtyNodes.add(castOrConvertToDirtyNode(baseDef))
						dirtyNodes.add(castOrConvertToDirtyNode(def))
					}
				}
			}
		}

		return dirtyNodes;
	}

	private registerInheritWanter(def: def | InheritDef): void {
		if (!isReferencedDef(def)) {
			const crossRef: iInherit = { derived: new Set() }
			def = Object.assign(def, crossRef)
		}
		this._inheritWanters.add(<InheritDef>def)
	}

	/** resolve weakReference internally
	 * @returns dirty nodes which need to be re-evaluated
	 */
	private resolveWeakRefWanters(): Set<DirtyNode> {
		const dirtyNodes = new Set<DirtyNode>()
		for (const refNode of this._weakDefRefWanters.values()) {
			const tag = refNode.tag
			if (refNode.typeInfo.specialType?.defType) {
				const defType = refNode.typeInfo.specialType.defType.name // class or namespace.class
				if (refNode.text && refNode.text.content) { // check tag is not empty
					const defName = refNode.text.content
					const def = this.getByName(defType, defName)
					if (def) {
						const other = this.CastOrConvertToWeakRefNode(def)
						refNode.weakReference.out.add(other)
						other.weakReference.in.add(refNode)
						this._weakDefRefWanters.delete(refNode)

						dirtyNodes.add(castOrConvertToDirtyNode(refNode))
						dirtyNodes.add(castOrConvertToDirtyNode(other))
					}
				}
			}
		}

		return dirtyNodes
	}

	private registerWeakRefWanter(node: typeNode): void {
		const refNode = this.CastOrConvertToWeakRefNode(node)
		this._weakDefRefWanters.add(refNode)
	}

	/** assign values and return same instance but casted to WeakRefNode */
	private CastOrConvertToWeakRefNode(node: typeNode): WeakRefNode {
		let refNode: WeakRefNode
		if (!isWeakRefNode(node))
			refNode = Object.assign(node, { weakReference: { in: new Set(), out: new Set() } } as iWeakRef)
		else
			refNode = node

		return refNode
	}

	/**
	 * internal cleanup process before adding/updating new defs
	 * @param URILike 
	 * @returns dirty nodes which need to be re-evaluated
	 */
	private deleteDefs(URILike: URILike): Set<DirtyNode> {
		const dirtyNodes = new Set<DirtyNode>()
		const defs = this._defs.get(URILike)
		if (defs) {
			for (const def of defs) {
				const map = this._defDatabase.get(def.tag.content)
				if (map) {
					const defName = getDefName(def)
					if (defName) {
						map.delete(defName)
						if (map.size == 0)
							this._defDatabase.delete(def.tag.content)
					}
				}

				if (isReferencedDef(def)) {
					this.disconnectReferences(def)
						.map(node => dirtyNodes.add(node))
					// remove references
					this._inheritWanters.delete(def)

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

				// eslint-disable-next-line no-inner-declarations
				function GCIfZero(node: WeakRefNode): void {
					if (node.weakReference.in.size == 0 && node.weakReference.out.size == 0)
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						delete (<any>node).weakReference
				}

				const weakRefNodes = BFS(def).filter(isWeakRefNode)
				for (const refNode of weakRefNodes) {
					// disconnect incoming pointers
					for (const other of refNode.weakReference.in.values()) {
						assert(other.weakReference.out.has(refNode), `tried to remove remote reference, ${other} to ${refNode}`)
						other.weakReference.out.delete(refNode)
						assert(refNode.weakReference.in.has(other), `tried to remove origin reference, ${other} to ${refNode}`)
						refNode.weakReference.in.delete(other)
						GCIfZero(other)
						dirtyNodes.add(castOrConvertToDirtyNode(other))
					}

					// disconnect outgoing pointers
					for (const other of refNode.weakReference.out.values()) {
						assert(other.weakReference.in.has(refNode), `tried to remove remote reference, ${refNode} to ${other}`)
						other.weakReference.in.has(refNode)
						assert(refNode.weakReference.out.has(other), `tried to remove origin reference, ${refNode} to ${other}`)
						refNode.weakReference.out.delete(other)
						GCIfZero(other)
						dirtyNodes.add(castOrConvertToDirtyNode(other))
					}
				}
			}
			this._defs.delete(URILike)
		}

		return dirtyNodes
	}

	/**
	 * internal cleanup process
	 * @param def 
	 */
	private disconnectReferences(def: InheritDef): DirtyNode[] {
		const result: DirtyNode[] = []
		if (def.base) // remove cross-reference with parent
			assert(def.base.derived.delete(def),
				`tried to remove parent reference ${def.tag} which is not valid`)

		for (const derived of def.derived.values()) { // remove cross-reference with child
			assert(derived.base === def)
			derived.base = undefined
			this.registerInheritWanter(derived)
			result.push(castOrConvertToDirtyNode(derived))
		}

		return result
	}
}