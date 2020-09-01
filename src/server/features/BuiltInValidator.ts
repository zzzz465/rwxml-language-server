import { NodeValidationParticipant, NodeValidateFunction, NodeValidatorContext, ValidationResult } from './NodeValidator';
import { TypeIdentifier, typeNode, TypeInfo } from '../RW/TypeInfo';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { Node } from '../parser/XMLParser';
import { Range } from 'vscode-languageserver-textdocument';
import { isReferencedDef } from '../RW/DefTextDocuments';
// function pipeline 을 만들어야하나?
const builtInValidatorMap = new Map<string, NodeValidateFunction[]>()

function getOrCreate(key: string): NodeValidateFunction[] {
	if(!builtInValidatorMap.has(key))
		builtInValidatorMap.set(key, [])
	return builtInValidatorMap.get(key)!
}

// def reference 어떻게할래?

const TypeToFunction = [
	{ // 정수 체크
		types: [
			'System.UInt16',
			'System.UInt32',
			'System.UInt64',
			'System.Int16',
			'System.Int32',
			'System.Byte',
			'System.SByte',
		],
		functions: [
			checkOpenNode,
			checkInappropriateNode,
			checkWhitespaceError,
			checkInteger,
		]
	}
]

for (const data of TypeToFunction) {
	for (const type of data.types) {
		const arr = getOrCreate(type)
		// refactor this, 중복되지 않게 넣는것
		const funcs = data.functions.filter(func => !arr.find(d => d.name === func.name)) // 랙 만들 가능성 있음... 개선하자
		arr.push(...funcs)
	}
}

export const builtInValidationParticipant: NodeValidationParticipant = {
	getValidator: ({ typeIdentifier }: TypeInfo) => {
		const validators = builtInValidatorMap.get(typeIdentifier) || []
		return [checkDuplicateNode, checkParentDefValid, ...validators]
	}
}


function checkOpenNode(this: NodeValidatorContext, node: Node): ValidationResult {
	if (!node.closed) {
		return {
			diagnostics: [{
				message: 'node is not closed',
				range: this.getRangeIncludingTag(node)
			}],
			completeValidation: true
		}
	}
	return {}
}

function checkInappropriateNode(this: NodeValidatorContext, node: typeNode): ValidationResult {
	const result: ValidationResult = { completeValidation: true }
	const childNodes = node.typeInfo.childNodes
	if(childNodes && childNodes.size > 0) {
		result.diagnostics = []
		const wrongChilds = node.children.filter(c => c.closed && c.tag && !childNodes.has(c.tag))
			.map<Diagnostic>(n => ({ 
				message: 'inappropriate node', 
				range: this.getRangeIncludingTag(n) 
			}))
		result.diagnostics.push(...wrongChilds)
	}

	return result
}

function checkWhitespaceError (this: NodeValidatorContext, node: Node): ValidationResult {
	if(node.text) {
		const match = node.text.content.match(/ +$|^ +/) // match start/end whitespace
		if(match) {
			const textOffset = node.text.end - match[0].length
			return {
				diagnostics: [{
					message: 'content ends with illegal whitespace',
					range: {
						start: this.positionAt(textOffset),
						end: this.positionAt(node.text.end)
					}}]
			}
		}
	}
	return {}
}

const floatRegex = /[+-]?([0-9]*[.])?[0-9]+/

function checkInteger (this: NodeValidatorContext, node: Node): ValidationResult {
	if(node.text) {
		const matching = node.text.content.match(floatRegex)
		if(matching) {
			const textRange = this.getTextRange(node)
			return {
				diagnostics: [{
						message: 'expected integer value, received floating number',
						range: this.getTextRange(node)!,
						severity: DiagnosticSeverity.Warning,
						source: 'ex'
					}]}}}
	return {}
}

function checkDuplicateNode(this: NodeValidatorContext, node: typeNode): ValidationResult {
	const diagnostics: Diagnostic[] = []
	const marker: Set<string> = new Set() // tag marker
	for (const childNode of node.children) {
		if (!childNode.tag) continue
		if (marker.has(childNode.tag)) {
			diagnostics.push({
				message: 'found duplicate node',
				range: this.getRangeIncludingTag(childNode),
				severity: DiagnosticSeverity.Error
			})
		} else {
			marker.add(childNode.tag)
		}
	}
	const complete = diagnostics.length > 0
	return { completeValidation: complete, diagnostics: diagnostics }
}

function checkTexPathValid (this: NodeValidatorContext, node: typeNode): ValidationResult {
	const type = node.typeInfo
	if (!this.projectFiles) {
		return {
			completeValidation: true,
			diagnostics: [{
				message: 'no folder data was provided for validation',
				range: this.getTextRange(node),
				severity: DiagnosticSeverity.Hint
			}]
		}
	} else if (node.text) {
		const text = node.text
		if ((!this.projectFiles.has(text.content))) {
			return {
				completeValidation: true,
				diagnostics: [{
					message: 'invalid texture path',
					range: this.getTextRange(node),

				}]
			}
		}
	}
	return { }
}

function checkDefReference (this: NodeValidatorContext, node: typeNode): ValidationResult {


	return { }
}

function checkParentDefValid (this: NodeValidatorContext, node: typeNode): ValidationResult {
	const result: ValidationResult = {}
	const typeInfo = node.typeInfo
	if (node.attributes && node.attributes.ParentName) {
		const parentName = node.attributes.ParentName
		if (!isReferencedDef(node) || (node.base?.attributes?.Name !== parentName)) {
			result.completeValidation = true
			const attrRange = this.getAttributeRange(node, 'ParentName')
			result.diagnostics = [{
				message: 'invalid parent Name',
				range: attrRange?.value || this.getRangeIncludingTag(node)
			}]
		}
	}

	return result
}

/*
TODO
li node 지원
*/