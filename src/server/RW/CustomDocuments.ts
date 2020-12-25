/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-namespace */
import { DidChangeTextDocumentParams, DidCloseTextDocumentParams, DidOpenTextDocumentParams, DocumentUri, IConnection } from 'vscode-languageserver'
import { Event, iEvent } from '../../common/event'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DefFileAddedNotificationType, DefFileChangedNotificationType, DefFileRemovedNotificationType, DefFilesChanged, DefFilesRemoved, ReferencedDefFileAddedNotificationType } from '../../common/Defs'

export interface DocumentEvent {
	textDocument: TextDocument
}

export type DocumentAddedEvent = DocumentEvent & {
	isReferenced: boolean
	version: string
}

export type DocumentChangedEvent = DocumentEvent

export type DocumentDeletedEvent = DocumentEvent

export class CustomTextDocuments {
	/** documents from ProjectWatcher */
	private fileDocuments = new Map<DocumentUri, TextDocument>()
	/** documents from currently opened */
	private editorDocuments = new Map<DocumentUri, TextDocument>()
	private _ReferenceDocumentsAdded = new Event<DocumentAddedEvent>()
	get ReferenceDocumentsAdded(): iEvent<DocumentAddedEvent> { return this._ReferenceDocumentsAdded }

	private _DocumentAdded = new Event<DocumentAddedEvent>()
	get DocumentAdded(): iEvent<DocumentAddedEvent> { return this._DocumentAdded }

	private _DocumentChanged = new Event<DocumentChangedEvent>()
	get DocumentChanged(): iEvent<DocumentChangedEvent> { return this._DocumentChanged }

	private _DocumentDeleted = new Event<DocumentDeletedEvent>()
	get DocumentDeleted(): iEvent<DocumentDeletedEvent> { return this._DocumentDeleted }

	GetDocument(documentUri: DocumentUri): TextDocument | undefined {
		return this.editorDocuments.get(documentUri) || this.fileDocuments.get(documentUri)
	}

	// two strategies here
	// 1) we accept any global event, which is raised by Defs/**/*.xml watcher
	// 2) if the same file is watched textDocument, then previous event will be ignored
	// and we'll accept textDocument's event for a sync and incremental udpate
	listen(connection: IConnection): void {
		connection.onNotification(DefFileAddedNotificationType, this.OnDocumentAdded.bind(this))
		connection.onNotification(DefFileChangedNotificationType, this.OnDocumentChanged.bind(this))
		connection.onNotification(DefFileRemovedNotificationType, this.OnDocumentRemoved.bind(this))
		// 레퍼런스용 코드
		connection.onNotification(ReferencedDefFileAddedNotificationType, this.OnDocumentAdded.bind(this))
		// 에디터 문서용 코드
		connection.onDidOpenTextDocument(this.OnEditorDocumentAdded.bind(this))
		connection.onDidChangeTextDocument(this.OnEditorDocumentChanged.bind(this))
		connection.onDidCloseTextDocument(this.OnEditorDocumentClosed.bind(this))
	}

	private OnDocumentAdded(params: DefFilesChanged): void {
		for (const [uri, text] of Object.entries(params.files)) {
			const doc = TextDocument.create(uri, 'xml', 1, text)
			this.fileDocuments.set(uri, doc)
			this._DocumentAdded.Invoke({
				isReferenced: false, textDocument: doc, version: params.version
			})
		}
	}

	private OnDocumentChanged(params: DefFilesChanged): void {
		for (const [uri, text] of Object.entries(params.files)) {
			const doc = this.fileDocuments.get(uri)
			if (doc) {
				TextDocument.update(doc, [{ // just replace entire text
					range: { start: { line: 0, character: 0 }, end: { character: 0, line: doc.lineCount } },
					text
				}], doc.version + 1)
				if (!this.editorDocuments.has(uri)) // opened documents 는 editor 쪽에서 invoke함
					this._DocumentChanged.Invoke({ textDocument: doc })
			} else {
				throw new Error(`document ${uri} was not registered but raised during OnDocumentChanged Event`)
			}
		}
	}

	private OnDocumentRemoved(params: DefFilesRemoved): void {
		for (const uri of params.files) {
			const doc = this.fileDocuments.get(uri)
			if (doc) {
				this._DocumentDeleted.Invoke({ textDocument: doc })
				this.fileDocuments.delete(uri)
			}
		}
	}

	private OnEditorDocumentAdded({ textDocument }: DidOpenTextDocumentParams): void {
		this.editorDocuments.set(textDocument.uri,
			TextDocument.create(textDocument.uri, textDocument.languageId, textDocument.version, textDocument.text))
	}

	private OnEditorDocumentChanged({ contentChanges, textDocument }: DidChangeTextDocumentParams): void {
		const doc = this.editorDocuments.get(textDocument.uri)
		if (doc) {
			TextDocument.update(doc, contentChanges, doc.version + 1)
			this._DocumentChanged.Invoke({ textDocument: doc })
		} else {
			throw new Error(`document ${textDocument.uri} was not registered but raised during OnEditorDocumentChanged`)
		}
	}

	private OnEditorDocumentClosed({ textDocument }: DidCloseTextDocumentParams): void {
		if (this.editorDocuments.has(textDocument.uri))
			this.editorDocuments.delete(textDocument.uri)
	}

	/**
	 * clear internal documents.  
	 * should be only called when [ConfigChanged](#) event is raised.
	 */
	clear(): void {
		this.editorDocuments = new Map()
		this.fileDocuments = new Map()
	}
}