import '../server/parser/XMLParser'
import '../server/parser/XMLScanner'
import { Node, textRange } from '../server/parser/XMLParser'
import { CompletionItem } from 'vscode-languageserver'
import * as _ from 'lodash'
import { EOL } from 'os'

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
	/** does it have an association with textures?
	 * @deprecated cannot use, need to be removed
	 */
	texPath?: string
	/** does original class inherits Verse.Def class? */
	defType?: {
		/** name of the class */
		name: string
		/** indicate def is served by external mod, not RimWorld assembly */
		customModClass?: boolean
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
	enum?: boolean
	integer?: boolean
	float?: boolean
	bool?: boolean
	string?: boolean
	color?: boolean
	intVec3?: boolean
	intRange?: boolean
	floatRange?: boolean
}

export interface TypeInfo {
	isLeafNode: boolean // does we really need this? maybe.
	/** ${namespace}.${classname} */
	typeIdentifier: TypeIdentifier
	specialType?: specialType
	suggestedAttributes?: Map<string, CompletionItem> // CompletionItem[]
	leafNodeCompletions?: Map<string, CompletionItem> // CompletionItem[]
	childNodes?: Map<string, TypeIdentifier>
	// 하위 노드는 string key을 suggestion, 그리고 CompletionItem[]은 말단노드의 string 값을 추천할때 사용됨
}

function ObjToMap(object: any): Map<string, CompletionItem> {
	const result = new Map<string, CompletionItem>()
	for (const value of Object.values<CompletionItem>(object))
		result.set(value.label, value)

	return result
}

export class TypeInfo implements TypeInfo {
	constructor(data: any) { // only accepts
		Object.assign(this, data)

		if (this.suggestedAttributes) {
			this.suggestedAttributes = ObjToMap(this.suggestedAttributes)
		}

		if (this.leafNodeCompletions) {
			this.leafNodeCompletions = ObjToMap(this.leafNodeCompletions)
		}

		if (!_.isEmpty(data.childNodes)) {
			const childNodes: Record<string, TypeIdentifier> = data.childNodes
			this.childNodes = new Map()
			for (const [key, typeIdentifier] of Object.entries(childNodes)) {
				this.childNodes.set(key, typeIdentifier) // 이게 별도의 Object일수도 있다는 점을 주의하자, 값은 같고 ref 은 다름
			}
		}
	}

	toString(): string {
		const text = [
			`typeId: ${this.typeIdentifier}`
		]

		return text.join(EOL)
	}
}

export function objToTypeInfos(raw: any): TypeInfo[] {
	const types = Object.values(raw)
		.map(data => new TypeInfo(data))
	return types
}

export interface def extends typeNode {
	closed: true
	tag: textRange // it is important
}

export function isDef(obj: Node): obj is def {
	return isTypeNode(obj) && !!obj.tag && obj.closed && obj.parent?.tag?.content === 'Defs'
}

export interface typeNode extends Node {
	typeInfo: TypeInfo;
}

export class TypeInfoMap extends Map<string, TypeInfo> {
	private typeMap: Map<string, TypeInfo>
	/** compMap class basetype - <name - typeinfo>, possible name conflict */
	private compMap: Map<TypeIdentifier, Map<string, TypeInfo>>
	constructor(typeInfos: TypeInfo[]) {
		super()
		this.typeMap = new Map()
		this.compMap = new Map()
		for (const typeInfo of typeInfos) {
			this.set(typeInfo.typeIdentifier, typeInfo)

			if (typeInfo.specialType) {
				const defType = typeInfo.specialType.defType?.name
				if (defType) {
					if (!this.typeMap.has(defType))
						this.typeMap.set(defType, typeInfo)
					else
						console.log(`duplicate defType ${defType}`)
				}

				if (typeInfo.specialType.compClass) {
					let name: string
					if (typeInfo.typeIdentifier.match(/^Verse|^RimWorld/))
						name = typeInfo.typeIdentifier.split('.').reverse()[0]
					else
						name = typeInfo.typeIdentifier

					const baseName = typeInfo.specialType.compClass.baseClass
					let map = this.compMap.get(baseName)
					if (!map) {
						map = new Map()
						this.compMap.set(baseName, map)
					}

					if (!map.has(name))
						map.set(name, typeInfo)
					else
						console.log(`duplicate comp className ${name}`)
				}
			}
		}
	}

	/**
	 * 
	 * @param id 
	 */
	getByTypeIdentifier(id: TypeIdentifier): TypeInfo | undefined {
		return this.get(id)
	}

	/**
	 * 
	 * @param typeName ThingDef, DamageDef, etc...
	 */
	getByDefName(typeName: string): TypeInfo | undefined {
		return this.typeMap.get(typeName)
	}

	getDefNames(): string[] {
		return [...this.typeMap.keys()]
	}

	getComp(name: string, baseType?: TypeIdentifier): TypeInfo | undefined {
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
	* getComps(baseType?: TypeIdentifier): Generator<[string, TypeInfo], void, unknown> {
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
	constructor(private typeInfoMap: TypeInfoMap) {

	}

	public Inject(typeNode: Node): void {
		const typeName = typeNode.tag?.content
		if (typeName) {
			const typeInfo = this.typeInfoMap.getByDefName(typeName)
			if (typeInfo) {
				const assigned = Object.assign(typeNode, { typeInfo })
				this._convertInternal(assigned)
			}
		}
	}

	private _convertInternal(node: typeNode): void {
		const queue: typeNode[] = [node]
		while (queue.length > 0) {
			const node = queue.pop()!
			let typeInfo = node.typeInfo // it can be replaced during compClass injection
			const specialTypes = typeInfo.specialType

			// if the node is List<T> and it's not treated as special (normal <li></li>)
			// we inject genericType into the node.
			if (typeInfo.specialType?.enumerable && typeInfo.specialType.enumerable.isSpecial !== true) {
				const genericType = typeInfo.specialType.enumerable.genericType
				const childType = this.typeInfoMap.getByTypeIdentifier(genericType)
				if (!childType) continue
				for (const childNode of node.children)
					queue.push(Object.assign(childNode, { typeInfo: childType }))
			}

			// Class="Value"
			const ClassValue = node.attributes?.Class
			if (ClassValue) {
				// <li Class="CompProperties_name">...(nodes)...</li>
				let injected = false
				if (specialTypes?.compClass) {
					const childType = this.typeInfoMap.getComp(ClassValue)
					if (childType) {
						node.typeInfo = childType
						typeInfo = node.typeInfo // notice
						injected = true
					}
				} else {
					const values = ClassValue.split('.')
					let newType: TypeInfo | undefined = undefined
					// assume if we have a namespace, then it is not in Rimworld / Verse namespace = custom one
					if (values.length > 1) {
						newType = this.typeInfoMap.getByTypeIdentifier(ClassValue)
					} else { // Find in Verse / RimWorld
						newType = this.typeInfoMap.getByTypeIdentifier(`RimWorld.${ClassValue}`) ||
							this.typeInfoMap.getByTypeIdentifier(`Verse.${ClassValue}`)
					}

					if (newType) {
						node.typeInfo = newType
						typeInfo = node.typeInfo
						injected = true
					}
				}
				if (!injected) // do we have to delete this? really?
					delete (<any>node).typeInfo
			}

			for (const childNode of node.children) {
				const childTag = childNode.tag?.content
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
	const defName = def.children.find(node => node.tag?.content === 'defName')?.text?.content
	return defName || null
}

/** 
 * get value of attribute "Name"  
 * note that this is not the identifier of the def itself
 */
export function getName(def: def): string | null {
	return def.attributes?.Name || null
}