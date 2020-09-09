import { Hover, MarkupContent } from 'vscode-languageserver';
import { DefTextDocument } from '../RW/DefTextDocuments';
import { Position } from 'vscode-languageserver-textdocument';
import { XMLDocument } from '../parser/XMLParser';
import { createScanner, TokenType } from '../parser/XMLScanner';
import { isTypeNode } from '../../common/TypeInfo';

interface HoverParams {
	document: DefTextDocument
	xmlDocument: XMLDocument
	offset: number
}

export function doHover({ document, xmlDocument, offset }: HoverParams): Hover | null | undefined {
	const node = xmlDocument.findNodeAt(offset)
	if (!isTypeNode(node)) return undefined

	const scanner = createScanner(document.getText(), node.start)
	let token = scanner.scan()
	let attrName = ''
	while (token !== TokenType.EOS) {
		const tokenOffset = scanner.getTokenOffset()
		const tokenEnd = scanner.getTokenEnd()

		const isInsideToken = () => tokenOffset <= offset && offset <= tokenEnd

		switch (token) {
			case TokenType.StartTag: {
				if (isInsideToken()) {
					return {
						contents: {
							kind: 'markdown',
							value: node.typeInfo.toString()
						} as MarkupContent
					}
				}
				break
			}

			case TokenType.AttributeName: {
				attrName = scanner.getTokenText()
				break
			}
		}

		token = scanner.scan()
	}

	return undefined
}