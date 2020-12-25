import { NodeValidationParticipant, NodeValidateFunction, NodeValidatorContext, ValidationResult } from '../NodeValidator'
import { TypeIdentifier, typeNode, TypeInfo } from '../../../common/TypeInfo'
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver'
import { Node } from '../../parser/XMLParser'
import { Range } from 'vscode-languageserver-textdocument'

export function checkOpenNode(this: NodeValidatorContext, node: Node): ValidationResult {
	if (!node.closed) {
		return {
			diagnostics: [{
				message: 'node is not closed',
				range: this.getRangeIncludingTag(node)
			}]
		}
	}
	return { diagnostics: [] }
}

export function checkInappropriateNode(this: NodeValidatorContext, node: typeNode): ValidationResult {
	const result: ValidationResult = { diagnostics: [] }
	const childNodes = node.typeInfo.childNodes
	if (childNodes && childNodes.size > 0) {
		result.diagnostics = []
		const wrongChilds = node.children.filter(c => c.closed && c.tag && !childNodes.has(c.tag.content))
			.map<Diagnostic>(n => ({
				message: 'inappropriate node',
				range: this.getRangeIncludingTag(n)
			}))
		result.diagnostics.push(...wrongChilds)
	}

	return result
}

export function checkDuplicateNode(this: NodeValidatorContext, node: typeNode): ValidationResult {
	const diagnostics: Diagnostic[] = []
	const marker: Set<string> = new Set() // tag marker
	if (!node.typeInfo.specialType?.enumerable) {
		for (const childNode of node.children) {
			if (!childNode.tag) continue
			if (marker.has(childNode.tag.content)) {
				diagnostics.push({
					message: 'found duplicate node',
					range: this.getRangeIncludingTag(childNode),
					severity: DiagnosticSeverity.Error
				})
			} else {
				marker.add(childNode.tag.content)
			}
		}
	}
	const complete = diagnostics.length > 0
	return { diagnostics: diagnostics }
}

export function checkInvalidNode(this: NodeValidatorContext, node: typeNode): ValidationResult {
	const result: ValidationResult = { diagnostics: [] }
	const typeInfo = node.typeInfo
	for (const child of node.children) {
		if (child.tag) {
			if (typeInfo.childNodes && !typeInfo.childNodes.has(child.tag.content)) {
				result.diagnostics.push({
					message: 'invalid child node',
					range: this.getRangeIncludingTag(child),
					severity: DiagnosticSeverity.Error
				})
			}
		}
	}

	return result
}