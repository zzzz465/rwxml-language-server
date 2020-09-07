import { TypeInfoMap, typeNode, def, TypeIdentifier, isTypeNode, TypeInfo } from '../RW/TypeInfo';
import { Node, XMLDocument } from '../parser/XMLParser';
import { Diagnostic } from 'vscode-languageserver';
import { TextDocument, Range, Position } from 'vscode-languageserver-textdocument';
import { URILike } from '../../common/common';
import { assert } from 'console';
import { createScanner, TokenType } from '../parser/XMLScanner';
import { DefDatabase, iDefDatabase } from '../RW/DefTextDocuments';

const _WHS = ' '.charCodeAt(0)

export interface NodeValidatorContext {
	projectFiles?: ProjectFiles
	defDatabase?: iDefDatabase
	getRangeIncludingTag (node: Node): Range
	getRange (start: number, end: number): Range
	positionAt (offset: number): Position
	getMatchingRangeRegex (regex: RegExp, range: Range): Range | null
	getTextRange (node: Node): Range
	getAttributeRange (node: Node, attributeName: string): { name: Range, value: Range } | undefined
}

export interface NodeValidateFunction {
	(this:NodeValidatorContext, node: typeNode): ValidationResult
}

export interface ValidationResult {
	completeValidation?: boolean
	diagnostics?: Diagnostic[]
}

export interface NodeValidationParticipant {
	getValidator (typeId: TypeInfo): NodeValidateFunction[]
}

export type ProjectFiles = Set<URILike>

export class NodeValidator implements NodeValidatorContext {
	private diagnostics: Diagnostic[]
	/** 
	 * @param projectFiles which contain all files in the specific version project folders
	 * this is used to check the file exists, it can be undefined
	 */
	constructor (private map: TypeInfoMap, 
		private textDocument: TextDocument, 
		private XMLDocument: XMLDocument,
		private nodeValidationParticipants: NodeValidationParticipant[],
		readonly projectFiles?: ProjectFiles,
		readonly defDatabase?: iDefDatabase) {
		this.diagnostics = []
	}

	validateNodes (): Diagnostic[] {
		this.diagnostics = []
		const root = this.XMLDocument.root
		if(root?.tag === 'Defs') {
			for (const def of root.children) {
				// todo - check if node is actual def, or not
				if (isTypeNode(def))
					this.validateDefNode(def as def)
			}
		}

		return this.diagnostics
	}

	getRangeIncludingTag (node: Node): Range {
		return { 
			start: this.textDocument.positionAt(node.start), 
			end: this.textDocument.positionAt(node.end) 
		}
	}
	
	getRange (start: number, end: number): Range {
		return { // 이거 어떻게 할까?
			start: this.textDocument.positionAt(start),
			end: this.textDocument.positionAt(end)
		}
	}

	// returns first matching range of regex, or null if it can't find any, or out of bound
	getMatchingRangeRegex (regex: RegExp, range: Range): Range | null {
		const text = this.textDocument.getText(range)
		const match = text.match(regex)
		if(match?.index) { // why it returns null?
			const matchOffset = this.textDocument.offsetAt(range.start) + match.index
			return {
				start: this.textDocument.positionAt(matchOffset),
				end: this.textDocument.positionAt(matchOffset + text.length)
			}
		}

		return null
	}

	/**
	 * @param node target node, note that node.text variable should be valid
	 */
	getTextRange (node: Node): Range {
		assert(node.text, `invalid node ${node} was passed, node.text is undefined / null`)
		const text = node.text!
		return {
			start: this.textDocument.positionAt(text.start),
			end: this.textDocument.positionAt(text.end)
		}
	}

	getAttributeRange(node: Node, attributeName: string): { name: Range, value: Range } | undefined {
		if (!node.startTagEnd) return undefined
		// const start = this.textDocument.positionAt(node.start)
		// const end = this.textDocument.positionAt(node.startTagEnd)
		const scanner = createScanner(this.textDocument.getText(), node.start)
		let token = scanner.scan()
		let name: Range | undefined = undefined
		let value: Range | undefined = undefined
		while (token !== TokenType.EOS && token !== TokenType.StartTagClose) {
			switch(token) {
				case TokenType.AttributeName: {
					if (scanner.getTokenText() !== attributeName) break
					const start = scanner.getTokenOffset()
					const end = scanner.getTokenEnd()
					name = {
						start: this.textDocument.positionAt(start),
						end: this.textDocument.positionAt(end)
					}
					break
				}
				case TokenType.AttributeValue: {
					if (!name) break
					const start = scanner.getTokenOffset()
					const end = scanner.getTokenEnd()
					value = {
						start: this.textDocument.positionAt(start),
						end: this.textDocument.positionAt(end)
					}
					return { name, value }
				}
			}
			token = scanner.scan()
		}
		return undefined
	}

	positionAt (offset: number): Position { return this.textDocument.positionAt(offset) }

	private validateDefNode (def: def) {
		const queue: typeNode[] = [def]
		while(queue.length > 0) { // BFS
			const curr = queue.pop()!
			const typeInfo = curr.typeInfo

			const validators = this.nodeValidationParticipants.reduce((arr, p) => {
				arr.push(...(p.getValidator(typeInfo)))
				return arr
			}, [] as NodeValidateFunction[])
				
			for (const func of validators) {
				const { diagnostics: result, completeValidation: completed } = func.call(this, curr)
				if (result) {
					this.diagnostics.push(...result)
					if(result.length > 0 && completed === true)
						break
				}
			}
			
			for (const child of curr.children)
				if(isTypeNode(child)) queue.push(child)
		}
	}
}