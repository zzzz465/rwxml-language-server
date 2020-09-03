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
	enumerable?: {
		genericType: TypeIdentifier
		enumerableType: 'list' | 'array'
		/** does it use <li></li> or deseralized differently? */
		isSpecial?: boolean
	}
	/**  */
	specialType?: boolean
}

export interface TypeInfo { // 이거만 가져와보자
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

		for (const typeInfo of typeInfos) {
			const defType = typeInfo.specialTypes?.def?.defType
			if (defType) {
				if (!this.typeMap.has(defType))
					this.typeMap.set(defType, typeInfo)
				else
					console.log(`duplicate defType ${defType}`)
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
			if(typeInfo) {
				const assigned = Object.assign(typeNode, { typeInfo })
				this._convertInternal(assigned)
			}
		}
	}

	private _convertInternal(node: typeNode): void {
		const queue: typeNode[] = [node]
		while (queue.length > 0) {
			const node = queue.pop()!
			const typeInfo = node.typeInfo

			// if the node is List<T> and it's not treated as special (normal <li></li>)
			// we inject genericType into the node.
			if (typeInfo.specialTypes?.enumerable && typeInfo.specialTypes.enumerable.isSpecial !== true) {
				const genericType = typeInfo.specialTypes.enumerable.genericType
				const childType = this.typeInfoMap.getByTypeIdentifier(genericType)
				if (!childType) continue
				for (const childNode of node.children)
					queue.push(Object.assign(childNode, { typeInfo: childType }))
			}

			for (const childNode of node.children) {
				const childTag = childNode.tag
				if (!childTag) continue
				const childTypeInfoIdentifier = typeInfo.childNodes?.get(childTag)
				if (!childTypeInfoIdentifier) continue
				const childTypeInfo = this.typeInfoMap.getByTypeIdentifier(childTypeInfoIdentifier)
				if (!childTypeInfo) continue

				queue.push(Object.assign(childNode, { typeInfo: childTypeInfo }))
			}
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