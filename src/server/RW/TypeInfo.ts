import '../parser/XMLParser'
import '../parser/XMLScanner'
import { XMLDocument, Node } from '../parser/XMLParser'
import { CompletionItem, MarkupContent, CompletionItemKind } from 'vscode-languageserver'
import * as _ from 'lodash'

export interface defInfo {
	isAbstract: boolean
	defIdentifier: string; // Name attribute or defName attribute
	children: defInfo[]
}

/** namespace+class name. ex) System.Int32 */
export type TypeIdentifier = string;

/** 
 * an object to check whether the node is special or not  
 * it can have multiple flags
 */
export interface specialType {
	/** does it have an association with textures? */
	texPath?: boolean
	/** does original class inherits Verse.Def class? */
	def?: {
		/** name of the class */
		defType: string
	}
	Enumerable?: {
		genericType: TypeIdentifier
		enumerableType: 'list' | 'array'
		/** does it use <li></li> or deseralized differently? */
		isSpecial?: boolean
	}
	/**  */
	specialType?: boolean
}

export interface TypeInfo { // 이거만 가져와보자
	isDefNode: boolean
	isLeafNode: boolean
	typeIdentifier: TypeIdentifier
	specialTypes?: specialType
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
	closed: true
	tag: string // it is important
}

export function isDef (obj: Node): obj is def {
	return isTypeNode(obj) && !!obj.tag && obj.closed && obj.parent?.tag === 'Defs'
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

	/**
	 * 
	 * @param id 
	 */
	getByTypeIdentifier (id: TypeIdentifier): TypeInfo | undefined {
		return this.get(id)
	}

	/**
	 * 
	 * @param typeName ThingDef, DamageDef, etc...
	 */
	getByDefName (typeName: string): TypeInfo | undefined {
		return this.typeMap.get(typeName)
	}

	getDefNames (): string[] {
		return [...this.typeMap.keys()]
	}
}

export class TypeInfoInjector {
	constructor (private typeInfoMap: TypeInfoMap) {

	}

	public Inject(typeNode: Node): void {
		const typeName = typeNode.tag
		if(typeName) {
			const typeInfo = this.typeInfoMap.getByDefName(typeName)
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

export function getDefName(def: def): string | null {
	const defName = def.children.find(node => node.tag === 'defName')?.text?.content
	return defName || null
}

/** 
 * get value of attribute "Name"  
 * note that this is not the identifier of the def itself
 */
export function getName(def: def): string | null {
	return def.attributes?.Name || null
}