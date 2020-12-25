import { def, isDef, TypeInfoInjector } from '../../common/TypeInfo'
import { DocumentUri, TextDocument } from 'vscode-languageserver-textdocument'
import { parse, XMLDocument } from '../parser/XMLParser'

export interface DefDocument extends XMLDocument {
	defs: def[]
}

export class DefDocuments {
	private documents = new Map<DocumentUri, DefDocument>()
	constructor(private readonly typeInjector: TypeInfoInjector) {

	}

	GetDefDocument(uri: DocumentUri): DefDocument | undefined {
		return this.documents.get(uri)
	}

	DocumentAdd(document: TextDocument): DefDocument {
		const defDocument = this.parseText(document.getText(), document.uri, this.typeInjector)
		this.documents.set(document.uri, defDocument)

		return defDocument
	}

	DocumentChange(document: TextDocument): DefDocument {
		const defDocument = this.parseText(document.getText(), document.uri, this.typeInjector)
		this.documents.set(document.uri, defDocument)

		return defDocument
	}

	DocumentDelete(uri: DocumentUri): void {
		this.documents.delete(uri)
	}

	private parseText(content: string, uri: DocumentUri, injector: TypeInfoInjector): DefDocument {
		const defDoc = Object.assign(parse(content, uri), { defs: [] }) as DefDocument
		if (defDoc.root?.tag?.content === 'Defs') { // if the root node is <Defs>
			for (const node of defDoc.root.children) {
				injector.Inject(node)
				if (isDef(node))
					defDoc.defs.push(node)
			}
		}

		return defDoc
	}
}