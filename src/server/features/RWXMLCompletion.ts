import { TextDocument, Position, Range } from 'vscode-languageserver-textdocument';
import { XMLDocument, Node } from '../parser/XMLParser';
import { CompletionList, CompletionItem } from 'vscode-languageserver';
import { createScanner } from '../parser/XMLScanner';
import { TokenType, ScannerState, Scanner } from '../htmlLanguageTypes';
import { TypeInfo, isTypeNode, typeNode, isDef } from '../RW/TypeInfo'
import { URILike } from '../../common/common'
import { relative, basename } from 'path';
import { DefDatabase, iDefDatabase } from '../RW/DefTextDocuments';

export interface filesQuery {
	(path: URILike): Promise<URILike[]>
}

// TODO - need code refactor
export class RWXMLCompletion {
	constructor () {

	}

	doComplete(document: TextDocument, 
		position: Position, 
		XMLDocument: XMLDocument,
		defDatabase?: iDefDatabase): CompletionList {
		const result: CompletionList = {
			isIncomplete: false,
			items: []
		}

		function scanNextForEndPos(nextToken: TokenType): number {
			if (offset === scanner.getTokenEnd()) {
				token = scanner.scan()
				if(token === nextToken && scanner.getTokenOffset() === offset) {
					return scanner.getTokenEnd()
				}
			}
			return offset
		}

		function getReplaceRange(replaceStart: number, replaceEnd: number = offset): Range {
			if (replaceStart > offset) {
				replaceStart = offset;
			}
			return { start: document.positionAt(replaceStart), end: document.positionAt(replaceEnd) }
		}
		
		// TODO - fix this
		const collectDefNodeValueSuggestions = (contentOffset: number, tagNameEnd?: number ) => {
			// TODO - performance alert!
			// pretty sure this need to be cached...
			/*
			const collectImageNodeSuggestions: (node: typeNode) => Promise<CompletionItem[]> 
				= async () => {
				if(document.loadFolders && document.loadFolders.Textures && this.query) {
					const textures =  document.loadFolders.Textures
					const respond = await this.query(textures)
					respond.filter(path => !path.match(/png$|jpeg$|jpg$|gif$/))
					return respond.map(absPath => {
						const pathWithoutExt = relative(textures, absPath).replace(/\.[\w\W]+$/, '')
							.replace(/\\/g, '/') // replace \ to /
						const obj: CompletionItem = {
							label: pathWithoutExt,
							data: {
								type: 'image',
								absPath
							}
						}
						return obj
					})
				}
				return []
			}

			const range = getReplaceRange(contentOffset, tagNameEnd)
			const result: CompletionList = {
				isIncomplete: false,
				items: []
			}
			const node = XMLDocument.findNodeAt(contentOffset)
			if(isTypeNode(node)) {
				const typeInfo = node.typeInfo
				if (node.tag === 'texPath') {
					result.items = await collectImageNodeSuggestions(node)
				} else if(typeInfo.leafNodeCompletions) {
					result.items.push(...typeInfo.leafNodeCompletions)
				}
			}
			return result
			*/
			return { isIncomplete: false, items: [] } as CompletionList
		}


		function collectOpenDefNameTagSuggestions(afterOpenBracket: number, tagNameEnd?: number): CompletionList {
			const range = getReplaceRange(afterOpenBracket, tagNameEnd)
			// fill
			const result: CompletionList = {
				isIncomplete: false,
				items: []
			}
			const node = XMLDocument.findNodeAt(afterOpenBracket)
			const parentNode = node.parent || XMLDocument.findNodeBefore(node.start)
			if(isTypeNode(parentNode)) {
				const typeInfo = parentNode.typeInfo
				if(typeInfo.childNodes) {
					const nodes = [...typeInfo.childNodes.keys()].map<CompletionItem>(name => ({ label: name }))
					result.items.push(...nodes)
				}
				if(typeInfo.suggestedAttributes) {
					result.items.push(...typeInfo.suggestedAttributes)
				}
			}
			return result
		}

		function collectParentNameValueSuggestions(node: Node): CompletionList {
			const result: CompletionList = {
				isIncomplete: false,
				items: []
			}
			if (defDatabase && isDef(node)) {
				const defType = node.tag
				const names = defDatabase.getNames()
				result.items = names.map(name => ({
					label: name
				}))
			}

			return result
		}

		const text = document.getText()
		const offset = document.offsetAt(position) // line + offset 을 text offset으로 변경

		const node = XMLDocument.findNodeAt(offset)
		const node2 = XMLDocument.findNodeBefore(offset)

		const scanner = createScanner(text, node.start)
		let currentTag = ''
		let currentAttributeName = ''

		let token = scanner.scan()

		while (token !== TokenType.EOS && scanner.getTokenOffset() <= offset) {
			switch (token) {
				case TokenType.StartTagOpen:
					if(scanner.getTokenEnd() === offset) { // <
						const endPos = scanNextForEndPos(TokenType.StartTag)
						return collectOpenDefNameTagSuggestions(offset, endPos)
					}
					break
				case TokenType.StartTag:
					if(scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) { // 현재 offset이 token 의 중간일경우
						return collectOpenDefNameTagSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd())
					}
					currentTag = scanner.getTokenText()
					break
				case TokenType.DelimiterAssign: // ????
					break
				case TokenType.AttributeName:
					currentAttributeName = scanner.getTokenText()
					break
				case TokenType.AttributeValue:
					if (currentAttributeName === 'ParentName') {
						if(scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
							return collectParentNameValueSuggestions(node)
						}
					}
					break
				case TokenType.Whitespace:
					switch (scanner.getScannerState()) {
						case ScannerState.WithinTag:
						case ScannerState.AfterAttributeName:
							break
					}
					break
				case TokenType.EndTagOpen:
					if (offset <= scanner.getTokenEnd()) {

					}
					break
				case TokenType.EndTag:
					break
				case TokenType.StartTagClose:
					break
				case TokenType.Content:
					if(scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
						return collectDefNodeValueSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd())
					}
					break
				default:
					break
			}
			token = scanner.scan()
		}

		return result
	}
}