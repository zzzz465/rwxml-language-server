import { NodeValidationParticipant, NodeValidateFunction, NodeValidatorContext, ValidationResult } from '../NodeValidator'
import { TypeIdentifier, typeNode, TypeInfo } from '../../../common/TypeInfo'
import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver'
import { Node, textRange } from '../../parser/XMLParser'
import { Range } from 'vscode-languageserver-textdocument'
import { isFloat, isInteger, isBool } from '../textParser'

export function checkWhitespaceError(this: NodeValidatorContext, node: Node): ValidationResult {
	if (node.text) {
		const match = node.text.content.match(/ +$|^ +/) // match start/end whitespace
		if (match) {
			const textOffset = node.text.end - match[0].length
			return {
				diagnostics: [{
					message: 'content ends with illegal whitespace',
					range: {
						start: this.positionAt(textOffset),
						end: this.positionAt(node.text.end)
					}
				}]
			}
		}
	}
	return { diagnostics: [] }
}

export function checkInteger(this: NodeValidatorContext, node: Node): ValidationResult {
	const result: ValidationResult = { diagnostics: [] }

	if (node.text) {
		const text = node.text.content
		if (!isInteger(text)) {
			if (isFloat(text)) {
				result.diagnostics.push({
					message: 'expected integer value, found float value',
					range: this.getTextRange(node),
					severity: DiagnosticSeverity.Warning
				})
			} else {
				result.diagnostics.push({
					message: 'cannot parse text as float',
					range: this.getTextRange(node),
					severity: DiagnosticSeverity.Error
				})
			}
		}
	}

	return result
}

export function checkFloat(this: NodeValidatorContext, node: Node): ValidationResult {
	const result: ValidationResult = { diagnostics: [] }
	if (node.text) {
		if (!isFloat(node.text.content)) {
			result.diagnostics.push({
				message: 'cannot parse text as float',
				range: this.getTextRange(node),
				severity: DiagnosticSeverity.Error
			})
		}
	}

	return result
}