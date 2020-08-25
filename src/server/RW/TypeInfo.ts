import '../parser/XMLParser'
import '../parser/XMLScanner'
import { XMLDocument, Node } from '../parser/XMLParser'
import { CompletionItem, MarkupContent, CompletionItemKind } from 'vscode-languageserver'
import { type } from 'os'
import { cachedDataVersionTag } from 'v8'
import * as _ from 'lodash'

export interface defInfo {
	isAbstract: boolean
	defIdentifier: string; // Name attribute or defName attribute
	children: defInfo[]
}

export type TypeIdentifier = string;

export interface TypeInfo { // 이거만 가져와보자
	isDefNode: boolean
	isLeafNode: boolean
	typeIdentifier: TypeIdentifier
	suggestedAttributes?: CompletionItem[]
	leafNodeCompletions?: CompletionItem[]
	childNodes?: Map<string, TypeIdentifier>
	// 하위 노드는 string key을 suggestion, 그리고 CompletionItem[]은 말단노드의 string 값을 추천할때 사용됨
}

export class TypeInfo implements TypeInfo {
	constructor (data: any) { // only accepts
		this.isLeafNode = data.isLeafNode === true
		this.isDefNode = data.isDefNode === true
		this.typeIdentifier = data.typeIdentifier
		this.suggestedAttributes = data.suggestedAttributes
		this.leafNodeCompletions = data.leafNodeCompletions ? data.leafNodeCompletions : undefined

		if(!_.isEmpty(data.childNodes)) {
			const childNodes: Record<string, TypeIdentifier> = data.childNodes
			this.childNodes = new Map()
			for (const [key, typeIdentifier] of Object.entries(childNodes)) {
				this.childNodes.set(key, typeIdentifier) // 이게 별도의 Object일수도 있다는 점을 주의하자, 값은 같고 ref 은 다름
			}
		}
	}
}

export function objToTypeInfos(raw: any): TypeInfo[] {
	const types = Object.values(raw)
		.map(data => new TypeInfo(data))
	return types
}

export interface def extends typeNode {
	defName?: string // not used?
	closed: true
	tag: string // it is important
}

export interface typeNode extends Node {
	typeInfo: TypeInfo;
}

export class TypeInfoMap extends Map<string, TypeInfo> {
	private typeMap: Map<string, TypeInfo>
	constructor (typeInfos: TypeInfo[]) {
		super()
		this.typeMap = new Map()
		for (const typeInfo of typeInfos) {
			this.set(typeInfo.typeIdentifier, typeInfo)
		}

		const defTypeInfos = typeInfos.filter((info, index) => info.isDefNode)
		for (const typeInfo of defTypeInfos) {
			const result = typeInfo.typeIdentifier.match(/(?<=\.{0,1})[\w\d]+$/) // 중복되면 안됨
			if(result && result[0]) {
				const typeName = result[0]
				if(!this.typeMap.has(typeName)) {
					this.typeMap.set(typeName, typeInfo)
				} else {
					console.log(`duplicate defName ${typeName}`)
				}
			} else {
				console.log(`type marked as def but it doesn't match defName regex, value: ${typeInfo.typeIdentifier}`)
			}
		}
	}

	getByTypeIdentifier (id: TypeIdentifier): TypeInfo | undefined {
		return this.get(id)
	}

	getByTypeName (typeName: string) {
		return this.typeMap.get(typeName)
	}
}

export class TypeInfoInjector {
	constructor (private typeInfoMap: TypeInfoMap) {

	}

	public Inject(typeNode: Node): void {
		const typeName = typeNode.tag
		if(typeName) {
			const typeInfo = this.typeInfoMap.getByTypeName(typeName)
			if(typeInfo)
				this._convertInternal(typeNode, typeInfo)
		}
	}

	private _convertInternal(node: Node, typeInfo: TypeInfo): void {
		const assigned = Object.assign(node, { typeInfo })
		for (const childNode of assigned.children) { // TODO - refactor this ugly code
			const childTagName = childNode.tag
			if(!childTagName) continue

			const childTypeInfoIdentifier = typeInfo.childNodes?.get(childTagName)
			if(!childTypeInfoIdentifier) continue

			const childTypeInfo = this.typeInfoMap.getByTypeIdentifier(childTypeInfoIdentifier)
			if(!childTypeInfo) continue

			this._convertInternal(childNode, childTypeInfo)
		}
	}
}

export function isTypeNode(obj: any): obj is typeNode {
	return 'typeInfo' in obj
}

export interface GenericTypeInfo extends TypeInfo {
	genericType: TypeInfo | GenericTypeInfo
	fields: null
}

export function getDefIdentifier(def: def): string | null {
	const defName = def.children.find(node => node.tag === 'defName')?.text
	if (defName)
		return defName
	const Name = def.attributes?.Name
	return Name || null
}