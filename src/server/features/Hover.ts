import { Hover, MarkupContent } from 'vscode-languageserver'
import { XMLDocument } from '../parser/XMLParser'
import { createScanner, TokenType } from '../parser/XMLScanner'
import { isTypeNode } from '../../common/TypeInfo'
import { EOL } from 'os'
import { isWeakRefNode, WeakRefNode } from '../RW/DefDatabase'
import { TextDocument } from 'vscode-languageserver-textdocument'

interface HoverParams {
	document: TextDocument
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
					const values: string[] = [
						node.typeInfo.toString(),
					]

					if (isWeakRefNode(node))
						values.push(WeakRefNode.toString(node))

					return {
						contents: {
							kind: 'markdown',
							value: values.join(EOL)
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