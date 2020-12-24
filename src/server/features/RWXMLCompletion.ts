import { TextDocument, Position, Range } from 'vscode-languageserver-textdocument';
import { XMLDocument, Node } from '../parser/XMLParser';
import { CompletionList, CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { createScanner, TokenType, ScannerState } from '../parser/XMLScanner';
import { isTypeNode, isDef } from '../../common/TypeInfo'
import { iDefDatabase } from '../RW/DefTextDocuments';
import { AsEnumerable } from 'linq-es2015';
import { versionDB } from '../versionDB';

// TODO - need code refactor

export interface completionParams {
	version: string
	document: TextDocument
	position: Position
	xmlDocument: XMLDocument
	DB: versionDB
	defDatabase?: iDefDatabase
}

export function doComplete({
	version,
	DB,
	defDatabase,
	document,
	position,
	xmlDocument }: completionParams): CompletionList {
	const result: CompletionList = {
		isIncomplete: false,
		items: []
	}

	function scanNextForEndPos(nextToken: TokenType): number {
		if (offset === scanner.getTokenEnd()) {
			token = scanner.scan()
			if (token === nextToken && scanner.getTokenOffset() === offset) {
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
	const collectDefNodeValueSuggestions = (contentOffset: number, tagNameEnd?: number) => {
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

	function collectNodeTextValueSuggestions(): CompletionList {
		if (isTypeNode(node)) {
			const typeInfo = node.typeInfo
			if (typeInfo.specialType) {
				if (typeInfo.specialType.defType) { // suggest defNames...
					if (defDatabase) {
						const defs = defDatabase.getDefs(typeInfo.specialType.defType.name)
						return {
							isIncomplete: false,
							items: defs.map(def => ({
								label: def.children.find(node => node.tag?.content === 'defName')?.text?.content!
							}))
						}
					}
				} else if (typeInfo.isLeafNode && typeInfo.leafNodeCompletions) {
					return {
						isIncomplete: false,
						items: [...typeInfo.leafNodeCompletions.values()]  // typeInfo.leafNodeCompletions
					}
				}
			}
		}

		return {
			isIncomplete: false,
			items: []
		}
	}


	function collectOpenTagSuggestions(afterOpenBracket: number, tagNameEnd?: number): CompletionList {
		const range = getReplaceRange(afterOpenBracket, tagNameEnd)
		// fill
		const result: CompletionList = {
			isIncomplete: false,
			items: []
		}
		const node = xmlDocument.findNodeAt(afterOpenBracket)
		const parentNode = node.parent || xmlDocument.findNodeBefore(node.start)
		if (isTypeNode(parentNode)) {
			const typeInfo = parentNode.typeInfo
			if (typeInfo.specialType?.enumerable && !typeInfo.specialType.enumerable.isSpecial) {
				result.items.push({
					label: 'li'
				})
			} else {
				if (typeInfo.childNodes) {
					const nodes = [...typeInfo.childNodes.keys()].map<CompletionItem>(name => ({ label: name, kind: CompletionItemKind.Field }))
					result.items = nodes
				}
				if (typeInfo.suggestedAttributes) {
					result.items = [...typeInfo.suggestedAttributes.values()]
				}
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
				label: name, kind: CompletionItemKind.Enum
			}))
		}

		return result
	}

	function collectDefTagSuggestions(): CompletionList {
		const result: CompletionList = { isIncomplete: false, items: [] }
		result.items = DB.typeInfoMap.getDefNames().map(name => ({
			label: name, kind: CompletionItemKind.Constructor
		} as CompletionItem))

		return result
	}

	function collectAttributeSuggestions(attrName: string): CompletionList {
		const result: CompletionList = { isIncomplete: false, items: [] }

		const parent = node.parent

		switch (attrName) {
			case 'Class': {
				if (node.tag?.content === 'li' && parent && isTypeNode(parent) && parent.typeInfo.specialType?.enumerable) {
					const genericType = parent.typeInfo.specialType.enumerable.genericType
					const typeInfo = DB.typeInfoMap.getByTypeIdentifier(genericType)
					if (typeInfo) {
						const name = typeInfo.specialType?.compClass?.baseClass
						if (name) {
							const suggestions = [...DB.typeInfoMap.getComps(name)]
							result.items = AsEnumerable(suggestions).Select(([name, _]) => name)
								.Select(name => ({
									label: name, kind: CompletionItemKind.Class
								} as CompletionItem))
								.ToArray()
						}
					}
				}
			}
				break
		}
		return result
	}

	const text = document.getText()
	const offset = document.offsetAt(position) // line + offset 을 text offset으로 변경

	const node = xmlDocument.findNodeAt(offset)

	const scanner = createScanner(text, node.start)
	let lastToken = TokenType.Unknown
	let currentTag = ''
	let currentAttributeName = ''

	let token = scanner.scan()

	while (token !== TokenType.EOS && scanner.getTokenOffset() <= offset) {
		switch (token) {
			case TokenType.StartTagOpen:
				if (scanner.getTokenEnd() === offset) { // <
					if (node.parent?.tag?.content === 'Defs') { // XXXDef
						return collectDefTagSuggestions()
					} else {
						const endPos = scanNextForEndPos(TokenType.StartTag)
						return collectOpenTagSuggestions(offset, endPos)
					}
				}
				break
			case TokenType.StartTag:
				if (scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) { // 현재 offset이 token 의 중간일경우
					return collectOpenTagSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd())
				}
				currentTag = scanner.getTokenText()
				break
			case TokenType.StartTagClose:

				break
			case TokenType.DelimiterAssign: // ????
				break
			case TokenType.AttributeName:
				currentAttributeName = scanner.getTokenText()
				break
			case TokenType.AttributeValue:
				if (scanner.getTokenOffset() < offset && offset < scanner.getTokenEnd()) { // <tag Attr="|">
					switch (currentAttributeName) {
						case 'ParentName':
							return collectParentNameValueSuggestions(node)
						default:
							return collectAttributeSuggestions(currentAttributeName)
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
				if (lastToken === TokenType.StartTagClose && offset == scanner.getTokenOffset()) { // <tag>|</tag>
					return collectNodeTextValueSuggestions()
				}
				/*
				if (offset <= scanner.getTokenEnd()) {
					if (scanner.getScannerState() === ScannerState.WithinContent) { // <Tag>|</tag>
						return collectNodeTextValueSuggestions()
					}
				}
				*/
				break
			case TokenType.EndTag:
				break
			case TokenType.StartTagClose:
				break
			case TokenType.Content:
				if (scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
					// return collectDefNodeValueSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd())
					return collectNodeTextValueSuggestions()
				}
				break
			default:
				break
		}
		lastToken = token
		token = scanner.scan()
	}

	return result
}
