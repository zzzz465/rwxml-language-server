import { NodeValidationParticipant, NodeValidateFunction, NodeValidatorContext, ValidationResult } from './NodeValidator';
import { TypeIdentifier, typeNode } from '../RW/TypeInfo';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { Node } from '../parser/XMLParser';
import { Range } from 'vscode-languageserver-textdocument';
// function pipeline 을 만들어야하나?
const builtInValidatorMap = new Map<string, NodeValidateFunction[]>()

function getOrCreate(key: string): NodeValidateFunction[] {
	if(!builtInValidatorMap.has(key))
		builtInValidatorMap.set(key, [])
	return builtInValidatorMap.get(key)!
}

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
	getValidator: (typeId: TypeIdentifier) => {
		return builtInValidatorMap.get(typeId) || []
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
		const match = node.text.match(/ +$/) // match whitespace end of the text, only matches 1
		if(match) {
			const textOffset = node.textEnd! - match[0].length
			return {
				diagnostics: [{
					message: 'content ends with illegal whitespace',
					range: {
						start: this.positionAt(textOffset),
						end: this.positionAt(node.textEnd!)
					}}]
			}
		}
	}
	return {}
}

const floatRegex = /[+-]?([0-9]*[.])?[0-9]+/

function checkInteger (this: NodeValidatorContext, node: Node): ValidationResult {
	if(node.text) {
		const matching = node.text.match(floatRegex)
		if(matching) {
			const textRange = this.getTextRange(node)!
			return {
				diagnostics: [{
						message: 'expected integer value, received floating number',
						range: this.getTextRange(node)!,
						severity: DiagnosticSeverity.Warning,
						source: 'ex'
					}]}}}
	return {}
}