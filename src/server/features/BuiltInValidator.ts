import { NodeValidationParticipant, NodeValidateFunction, NodeValidatorContext, ValidationResult } from './NodeValidator'
import { typeNode, TypeInfo } from '../../common/TypeInfo'
import { DiagnosticSeverity } from 'vscode-languageserver'
import {
	checkDuplicateNode, checkInappropriateNode, checkInvalidNode,
	checkOpenNode
} from './validators/SubnodeValidators'
import {
	checkInteger, checkWhitespaceError
} from './validators/PrimitiveValidators'
import { isReferencedDef, isWeakRefNode } from '../RW/DefDatabase'
import { Node } from '../parser/XMLParser'
import * as Path from 'path'
// function pipeline 을 만들어야하나?
const builtInValidatorMap = new Map<string, NodeValidateFunction[]>()

function getOrCreate(key: string): NodeValidateFunction[] {
	if (!builtInValidatorMap.has(key))
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
	getValidator: ({ typeIdentifier, isLeafNode }: TypeInfo) => {
		const validators = builtInValidatorMap.get(typeIdentifier) || []

		if (isLeafNode) {
			const subNodeValidators = [
				checkDuplicateNode, checkInvalidNode, checkParentDefValid,
				checkInvalidDefNode, checkTexturePath
			]

			return validators.concat(subNodeValidators)
		} else {
			return validators
		}
	}
}



function checkParentDefValid(this: NodeValidatorContext, node: typeNode): ValidationResult {
	const result: ValidationResult = { diagnostics: [] }
	if (node.attributes && node.attributes.ParentName) {
		const parentName = node.attributes.ParentName
		const names = this.defDatabase?.getNames()
		const name = names?.find(name => name === parentName)
		if (!isReferencedDef(node) || name === undefined) {
			const attrRange = this.getAttributeRange(node, 'ParentName')
			result.diagnostics = [{
				message: 'invalid parent Name',
				range: attrRange?.value || this.getRangeIncludingTag(node)
			}]
		}
	}

	return result
}

function checkInvalidDefNode(this: NodeValidatorContext, node: typeNode): ValidationResult {
	const result: ValidationResult = { diagnostics: [] }
	const typeInfo = node.typeInfo
	if (typeInfo.specialType?.defType) {
		const defName = node.text?.content
		if (this.defDatabase && defName) // root Def node is not a target
			if (node.parent?.tag?.content !== 'Defs' && isWeakRefNode(node) && node.weakReference.out.size == 0)
				result.diagnostics = [{
					message: 'cannot find matching defName',
					range: this.getTextRange(node),
					severity: DiagnosticSeverity.Error
				}]
	}
	return result
}

// PawnGraphicSet 에 보면, ResolveAllGraphics() 라 해서 여러가지 이어주는게 있음
// 이거 보고 참고해보자, 패턴이 있나?
const set = new Set<string>([
	'bodyNakedGraphicPath', 'bodyDessicatedGraphicPath', 'HeadGraphicPath', 'texPath',
	'texture', 'wornGraphicPath', 'skeleton', 'clipPath', 'symbol', 'leaflessGraphicPath',
	'immatureGraphicPath', 'icon'
])
function isTextureNode(node: Node): boolean {
	return node.tag ? set.has(node.tag?.content) : false
}

function checkTexturePath(this: NodeValidatorContext, node: typeNode): ValidationResult {
	const result: ValidationResult = { diagnostics: [] }

	if (isTextureNode(node) && node.text) {
		const path = Path.parse(node.text.content)
		const nameRegex = new RegExp(`${path.name}(_[\w]+)?`, 'i') // rimworld's loading is case-insensitive
		const res = this.project.Textures.Find(path.dir, nameRegex)
		switch (res?.type) {
			case 'File':
				break
			case 'Directory':
				break
			case undefined:
				result.diagnostics.push({
					message: 'No File/Directory exists on given path',
					range: this.getTextRange(node),
					severity: DiagnosticSeverity.Error
				})
				break
		}
	}

	return result
}

/*
TODO
li node 지원
*/