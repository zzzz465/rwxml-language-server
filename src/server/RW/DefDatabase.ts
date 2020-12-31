import assert = require('assert')
import { def, typeNode, isTypeNode, getDefName, getName } from '../../common/TypeInfo'
import { DocumentUri } from 'vscode-languageserver-textdocument'
import { Node } from '../parser/XMLParser'
import { BFS } from '../utils/nodes'

/** typenode which need to be re-evaluated */
export type DirtyNode = iDirtyNode & typeNode

/** defName */
type defName = string
type defType = string

interface iInherit {
	base?: InheritDef
	derived: Set<InheritDef>
}

interface iWeakRef {
	weakReference: {
		/** set of nodes which is pointing this node */
		in: Set<WeakRefNode>
		/** set of nodes that this node is pointing */
		out: Set<WeakRefNode>
	}
}

export namespace WeakRefNode {
	export function toString(obj: WeakRefNode): string {
		return `out: ${obj.weakReference.out.size}, in: ${obj.weakReference.in.size}`
	}
}

export function isWeakRefNode(node: Node): node is WeakRefNode {
	if (!isTypeNode(node))
		return false

	if ('weakReference' in node) {
		const weakRef = (<any>node).weakReference
		return 'in' in weakRef && 'out' in weakRef
	} else {
		return false
	}
}

/** def that have relations with inheritance */
export type InheritDef = iInherit & def
/** def that have in-out reference */
export type WeakRefNode = iWeakRef & typeNode
export function isReferencedDef(obj: any): obj is InheritDef {
	return 'derived' in obj
}

interface iDirtyNode {
	dirtyStage: 'dirty' | 'handled'
}

export function isDirtyNode(obj: Node): obj is DirtyNode {
	return 'dirtyStage' in obj
}

function castOrConvertToDirtyNode(node: typeNode): DirtyNode {
	if (!isDirtyNode(node))
		return Object.assign(node, { dirtyStage: 'dirty' } as iDirtyNode)
	else
		return node
}

export interface iDefDatabase {
	getByURI(URIlike: DocumentUri): def[]
	getByName(defType: defType, name: string): def | null
	/**
	 * 
	 * @param defType defType string
	 */
	getDefs(defType: defType): def[]
	/** 
	 * returns Name candidate for inheritance
	 */
	getNames(): string[]
}

export class DefDatabase implements iDefDatabase {
	private _defs: Map<DocumentUri, (InheritDef | def)[]>
	private _defDatabase: Map<defType, Map<defName, Set<(InheritDef | def)>>>
	private _NameDatabase: Map<string, Set<(InheritDef | def)>> // note that Name is global thing-y
	private _inheritWanters: Set<InheritDef>
	private _weakDefRefWanters: Set<WeakRefNode>
	constructor(readonly version: string) {
		this._defs = new Map()
		this._defDatabase = new Map()
		this._inheritWanters = new Set()
		this._NameDatabase = new Map()
		this._weakDefRefWanters = new Set()
	}

	getByURI(URILike: DocumentUri): def[] { // only returns valid def
		return this._defs.get(URILike) || []
	}

	getByName(defType: defType, name: string): def | null { // defName or Name property
		const defs = this._defDatabase.get(defType)?.get(name)
		if (defs) {
			const res = defs.values().next()
			return res.value || null
		}
		return null
	}

	getDefs(defType: defType): def[] {
		const map = this._defDatabase.get(defType)
		if (map) {
			/** collect all defs */
			const defs = [...map.values()].reduce((prev, curr) => {
				prev.push(...curr.values())
				return prev
			}, [] as def[])

			return defs
		}
		return []
	}

	getNames(): string[] {
		return [...this._NameDatabase.keys()]
	}

	/**
	 * update defDatabase, returning dirty nodes which need to be re-evaluated
	 * @param documentUri 
	 * @param newDefs 
	 * @returns dirty nodes which need to be re-evaluated
	 */
	update(documentUri: DocumentUri, newDefs: def[]): Set<DirtyNode> {
		this.deleteDefs(documentUri)
		for (const def of newDefs) {
			if (!def.tag || !def.closed)
				continue

			// FIXME - 이거 상속 아니어도 defDataBase는 만들어둬야할듯!!!
			const defType = def.tag.content // defType
			const defName = getDefName(def)
			if (defName && defType) {
				let map = this._defDatabase.get(defType)
				if (!map) {
					map = new Map()
					this._defDatabase.set(defType, map)
				}

				let map2 = map.get(defName)
				if (!map2) {
					map2 = new Set()
					map.set(defName, map2)
				}
				assert(!map2.has(def), 'unexpected: def is already registered') // is it necessary?
				map2.add(def)
			}

			const Name = getName(def)
			if (Name) {
				let set = this._NameDatabase.get(Name)
				if (!set) {
					set = new Set()
					this._NameDatabase.set(Name, set)
				}
				set.add(def) // it shouldn't make any errors
			}

			if (def.attributes?.ParentName)
				this.registerInheritWanter(def)

			const weakRefWanters = BFS(def).filter<typeNode>(isTypeNode)
				.filter(node => node.typeInfo.specialType?.defType && node.text)
			weakRefWanters.map(node => this.registerWeakRefWanter(node))
		}

		this._defs.set(documentUri, newDefs)
		const dirty1 = this.resolveInheritWanters()
		const dirty2 = this.resolveWeakRefWanters()
		// merging two sets
		for (const val of dirty2)
			dirty1.add(val)

		return dirty1
	}

	/** delete file from defDatabase
	 *  
	 * */
	delete(DocumentUri: DocumentUri): Set<DirtyNode> {
		const result = this.update(DocumentUri, [])
		this._defs.delete(DocumentUri)
		return result
	}

	/** resolve inheritance interanlly
	 * @returns dirty nodes which need to be re-evaluated
	 */
	private resolveInheritWanters(): Set<DirtyNode> {
		const dirtyNodes: Set<DirtyNode> = new Set()
		for (const def of this._inheritWanters.values()) {
			const ParentName = def.attributes?.ParentName
			if (ParentName) {
				const baseDefs = this._NameDatabase.get(ParentName)
				if (baseDefs) {
					for (const baseDef of baseDefs) {
						if (!isReferencedDef(baseDef)) {
							const inherit: iInherit = { derived: new Set() }
							Object.assign(baseDef, inherit)
						}
						const baseDef2 = baseDef as InheritDef
						const set = baseDef2.derived
						set.add(def)
						def.base = <InheritDef>baseDef
						this._inheritWanters.delete(def)

						dirtyNodes.add(castOrConvertToDirtyNode(baseDef))
						dirtyNodes.add(castOrConvertToDirtyNode(def))
					}
				}
			}
		}

		return dirtyNodes
	}

	private registerInheritWanter(def: def | InheritDef): void {
		if (!isReferencedDef(def)) {
			const crossRef: iInherit = { derived: new Set() }
			def = Object.assign(def, crossRef)
		}
		this._inheritWanters.add(<InheritDef>def)
	}

	/** resolve weakReference internally
	 * @returns dirty nodes which need to be re-evaluated
	 */
	private resolveWeakRefWanters(): Set<DirtyNode> {
		const dirtyNodes = new Set<DirtyNode>()
		for (const refNode of this._weakDefRefWanters.values()) {
			const tag = refNode.tag
			if (refNode.typeInfo.specialType?.defType) {
				const defType = refNode.typeInfo.specialType.defType.name // class or namespace.class
				if (refNode.text && refNode.text.content) { // check tag is not empty
					const defName = refNode.text.content
					const def = this.getByName(defType, defName)
					if (def) {
						const other = this.CastOrConvertToWeakRefNode(def)
						refNode.weakReference.out.add(other)
						other.weakReference.in.add(refNode)
						this._weakDefRefWanters.delete(refNode)

						dirtyNodes.add(castOrConvertToDirtyNode(refNode))
						dirtyNodes.add(castOrConvertToDirtyNode(other))
					}
				}
			}
		}

		return dirtyNodes
	}

	private registerWeakRefWanter(node: typeNode): void {
		const refNode = this.CastOrConvertToWeakRefNode(node)
		this._weakDefRefWanters.add(refNode)
	}

	/** assign values and return same instance but casted to WeakRefNode */
	private CastOrConvertToWeakRefNode(node: typeNode): WeakRefNode {
		let refNode: WeakRefNode
		if (!isWeakRefNode(node))
			refNode = Object.assign(node, { weakReference: { in: new Set(), out: new Set() } } as iWeakRef)
		else
			refNode = node

		return refNode
	}

	/**
	 * internal cleanup process before adding/updating new defs
	 * @param URILike 
	 * @returns dirty nodes which need to be re-evaluated
	 */
	private deleteDefs(URILike: DocumentUri): Set<DirtyNode> {
		const dirtyNodes = new Set<DirtyNode>()
		const defs = this._defs.get(URILike)
		if (defs) {
			for (const def of defs) {
				const map = this._defDatabase.get(def.tag.content)
				if (map) {
					const defName = getDefName(def)
					if (defName) {
						map.delete(defName)
						if (map.size == 0)
							this._defDatabase.delete(def.tag.content)
					}
				}

				if (isReferencedDef(def)) {
					this.disconnectReferences(def)
						.map(node => dirtyNodes.add(node))
					// remove references
					this._inheritWanters.delete(def)

					const Name = getName(def)
					if (Name) {
						const set = this._NameDatabase.get(Name)
						if (set) {
							set.delete(def)
							if (set.size == 0) {
								this._NameDatabase.delete(Name)
							}
						}
					}

					delete def.base, def.derived
				}

				// eslint-disable-next-line no-inner-declarations
				function GCIfZero(node: WeakRefNode): void {
					if (node.weakReference.in.size == 0 && node.weakReference.out.size == 0)
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						delete (<any>node).weakReference
				}

				const weakRefNodes = BFS(def).filter(isWeakRefNode)
				for (const refNode of weakRefNodes) {
					// disconnect incoming pointers
					for (const other of refNode.weakReference.in.values()) {
						// assert(other.weakReference.out.has(refNode), `tried to remove remote out reference, ${other} to ${refNode}`)
						other.weakReference.out.delete(refNode)
						// assert(refNode.weakReference.in.has(other), `tried to remove origin in reference, ${other} to ${refNode}`)
						refNode.weakReference.in.delete(other)
						GCIfZero(other)
						dirtyNodes.add(castOrConvertToDirtyNode(other))
					}

					// disconnect outgoing pointers
					for (const other of refNode.weakReference.out.values()) {
						// assert(other.weakReference.in.has(refNode), `tried to remove remote in reference, ${refNode} to ${other}`)
						other.weakReference.in.has(refNode)
						// assert(refNode.weakReference.out.has(other), `tried to remove origin out reference, ${refNode} to ${other}`)
						refNode.weakReference.out.delete(other)
						GCIfZero(other)
						dirtyNodes.add(castOrConvertToDirtyNode(other))
					}
				}
			}
			this._defs.delete(URILike)
		}

		return dirtyNodes
	}

	/**
	 * internal cleanup process
	 * @param def 
	 */
	private disconnectReferences(def: InheritDef): DirtyNode[] {
		const result: DirtyNode[] = []
		if (def.base) // remove cross-reference with parent
			assert(def.base.derived.delete(def),
				`tried to remove parent reference ${def.tag} which is not valid`)

		for (const derived of def.derived.values()) { // remove cross-reference with child
			// assert(derived.base === def)
			derived.base = undefined
			this.registerInheritWanter(derived)
			result.push(castOrConvertToDirtyNode(derived))
		}

		return result
	}
}