/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-namespace */
import { URILike } from '../../common/common'
import { def, TypeInfoInjector, isTypeNode } from '../../common/TypeInfo'
import { IConnection } from 'vscode-languageserver'
import { Event, iEvent } from '../../common/event'
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType, ReferencedDefFileAddedNotificationType } from '../../common/Defs'
import { parse, XMLDocument } from '../parser/XMLParser'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { assert } from 'console'
import { versionDB } from '../versionDB'
import { getVersion } from '../../common/config'
import { DefDatabase, DirtyNode, iDefDatabase, sourcedDef } from './DefDatabase'

type version = string

export interface versionGetter {
	(path: URILike): version | undefined
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
			if (version) { // 유효한 경로인가?
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
