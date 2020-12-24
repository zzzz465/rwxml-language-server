import { Position, TextDocument } from 'vscode-languageserver-textdocument'
import { XMLDocument } from '../parser/XMLParser'
import { WorkspaceEdit, Range } from 'vscode-languageserver'
import { DefTextDocuments } from '../RW/DefTextDocuments'
import { createScanner, TokenType } from '../parser/XMLScanner'

export class XMLRename {
	constructor() {

	}

	doRename(document: TextDocument,
		position: Position,
		XMLDocument: XMLDocument,
		defDocuments: DefTextDocuments
	): WorkspaceEdit | null {
		const text = document.getText()
		const offset = document.offsetAt(position)
		const node = XMLDocument.findNodeAt(offset)

		const scanner = createScanner(text, node.start)
		let token = scanner.scan()
		let currentAttributeName = ''
		let currentTag = ''
		while (token !== TokenType.EOS &&
			scanner.getTokenOffset() <= offset &&
			scanner.getTokenEnd() < offset) {
			switch (token) {
				case TokenType.StartTag:
					currentTag = scanner.getTokenText()
					break

				case TokenType.AttributeName:
					currentAttributeName = scanner.getTokenText()
					break
			}

			token = scanner.scan()
		}

		switch (token) {
			case TokenType.AttributeValue: {
				// 루트 노드여야함
				// Name="" attribute 를 바꾸려고 할 때 -> derived 노드들의 이름도 바꿔야함
				if (currentAttributeName === 'Name' && node.parent?.tag?.content === 'Defs') { // Name="something" <-something
					// const range: Range = {
					// 
					// }
				}
			}
				break
		}
		return null
	}
}