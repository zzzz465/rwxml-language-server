import '../server/parser/XMLParser'
import '../server/parser/XMLScanner'
import { Node } from '../server/parser/XMLParser'
import { CompletionItem } from 'vscode-languageserver'
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
	texPath?: string
	/** does original class inherits Verse.Def class? */
	defType?: {
		/** name of the class */
		name: string
	}
	enumerable?: {
		genericType: TypeIdentifier
		enumerableType: 'list' | 'array'
		/** does it use <li></li> or deseralized differently? */
		isSpecial?: boolean
	}
	/**  */
	specialType?: boolean
	/** true when type has compClass field */
	compClass?: {
		baseClass: TypeIdentifier
	}
}

export interface TypeInfo { // 이거만 가져와보자
	isLeafNode: boolean
	/** ${namespace}.${classname} */
	typeIdentifier: TypeIdentifier
	specialTypes?: specialType
	suggestedAttributes?: CompletionItem[]
	leafNodeCompletions?: CompletionItem[]
	childNodes?: Map<string, TypeIdentifier>
	// 하위 노드는 string key을 suggestion, 그리고 CompletionItem[]은 말단노드의 string 값을 추천할때 사용됨
}

export class TypeInfo implements TypeInfo {
	constructor (data: any) { // only accepts
		Object.assign(this, data)

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
	/** compMap class basetype - <name - typeinfo>, possible name conflict */
	private compMap: Map<TypeIdentifier, Map<string, TypeInfo>>
	constructor (typeInfos: TypeInfo[]) {
		super()
		this.typeMap = new Map()
		this.compMap = new Map()
		for (const typeInfo of typeInfos) {
			this.set(typeInfo.typeIdentifier, typeInfo)

			if (typeInfo.specialTypes) {
				const defType = typeInfo.specialTypes.defType?.name
				if (defType) {
					if (!this.typeMap.has(defType))
						this.typeMap.set(defType, typeInfo)
					else
						console.log(`duplicate defType ${defType}`)
				}

				if (typeInfo.specialTypes.compClass) {
					const match = typeInfo.typeIdentifier.match(/(?<=\.)[\w]+$/) // match className
					if (match) {
						const name = match[0]
						const baseName = typeInfo.specialTypes.compClass.baseClass
						let map = this.compMap.get(baseName)
						if(!map) {
							map = new Map()
							this.compMap.set(baseName, map)
						}
						
						if(!map.has(name))
							map.set(name, typeInfo)
						else
							console.log(`duplicate comp className ${name}`)
					}
				}
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

	getComp (name: string, baseType?: TypeIdentifier): TypeInfo | undefined {
		if (baseType) {
			return this.compMap.get(baseType)?.get(name)
		} else {
			for (const map of this.compMap.values()) {
				const type = map.get(name)
				if (type) return type
			}
		}
	}

	/**
	 * iterator of comp name - typeinfo pair
	 * @param baseType 
	 */
	*getComps (baseType?: TypeIdentifier): Generator<[string, TypeInfo], void, unknown> {
		if (baseType) {
			const entries = this.compMap.get(baseType)
			if (entries) {
				for (const entry of entries)
					yield entry
			}
		} else {
			for (const map of this.compMap.values())
				for (const entry of map)
					yield entry
		}
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
			const specialTypes = typeInfo.specialTypes

			// if the node is List<T> and it's not treated as special (normal <li></li>)
			// we inject genericType into the node.
			if (typeInfo.specialTypes?.enumerable && typeInfo.specialTypes.enumerable.isSpecial !== true) {
				const genericType = typeInfo.specialTypes.enumerable.genericType
				const childType = this.typeInfoMap.getByTypeIdentifier(genericType)
				if (!childType) continue
				for (const childNode of node.children)
					queue.push(Object.assign(childNode, { typeInfo: childType }))
			}

			// <li Class="CompProperties_name">...(nodes)...</li>
			if (specialTypes?.compClass) {
				const className = node.attributes?.Class
				let injected = false
				if (className) {
					const childType = this.typeInfoMap.getComp(className)
					if (childType) {
						node.typeInfo = childType
						injected = true
					}
				}

				if (!injected)
					delete node.typeInfo
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