import {
  Def,
  DefDatabase,
  isDerivedType,
  NameDatabase,
  TypedElement,
  TypeInfoInjector,
  TypeInfoMap,
} from '@rwxml/analyzer'
import Deque from 'double-ended-queue'
import { array } from 'fp-ts'
import { pipe } from 'fp-ts/lib/function'
import _ from 'lodash'
import { MultiDictionary } from 'typescript-collections'
import * as winston from 'winston'
import { DocumentWithNodeMap } from './documentWithNodeMap'
import defaultLogger, { withClass, withVersion } from './log'
import { RimWorldVersion } from './RimWorldVersion'

export class DefManager {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(DefManager), withVersion(this.version ?? '')),
    transports: [defaultLogger()],
  })

  private referenceResolveWanter: MultiDictionary<string, TypedElement> = new MultiDictionary(
    undefined,
    undefined,
    true
  ) // defName, TypedElement
  private inheritResolveWanter: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true) // ParentName, TypedElement
  private readonly typeInfoInjector: TypeInfoInjector

  constructor(
    public readonly defDatabase: DefDatabase,
    public readonly nameDatabase: NameDatabase,
    public readonly typeInfoMap: TypeInfoMap,
    public readonly version?: RimWorldVersion
  ) {
    const defType = typeInfoMap.getTypeInfoByName('Def')
    if (!defType) {
      // eslint-disable-next-line quotes
      this.log.warn("cannot find type Def in typeInfoMap. something isn't right.")
      // throw new Error('cannot find def Type in typeInfoMap')
    }

    this.typeInfoInjector = new TypeInfoInjector(typeInfoMap)
  }

  getReferenceResolveWanters(defName: string): TypedElement[] {
    return this.referenceResolveWanter.getValue(defName)
  }

  getInheritResolveWanters(name: string): Def[] {
    return this.inheritResolveWanter.getValue(name)
  }

  /**
   * get Defs from given arguments
   * @param defType def type. eg: "ThingDef", "DamageDef", "RecipeDef", etc.
   * @param defName optional defName. it will find defs matching to the defName.
   * @param resolveBaseType resolve defs based on defName, including derived types.
   * @returns
   */
  getDef(defType: string, defName: string | undefined = undefined, resolveBaseType = true): Def[] {
    if (defName && resolveBaseType) {
      return this.getDefByDefName(defType, defName)
    } else {
      return this.defDatabase.getDef(defType)
    }
  }

  private getDefByDefName(defType: string, defName: string): Def[] {
    const baseType = this.typeInfoMap.getTypeInfoByName(defType)
    if (!baseType) {
      return []
    }

    const defs = this.defDatabase.getDefByName(defName)

    return pipe(
      defs,
      array.filter((def: Def) => isDerivedType(def.typeInfo, baseType))
    )
  }

  /**
   * @returns dirty nodes that require re-evaluation. (only referenced typedElement/defs are returned)
   */
  update(document: DocumentWithNodeMap): (TypedElement | Def)[] {
    const injectResult = this.typeInfoInjector.inject(document)

    const DefsFromDefDatabase = this.defDatabase.getDefByUri(document.uri)
    const DefsFromNameDatabase = this.nameDatabase.getDefByUri(document.uri)
    const removedDefs = _.union(DefsFromDefDatabase, DefsFromNameDatabase)

    // remove Def
    for (const def of removedDefs) {
      this.removeDef(def)
    }

    // add new def
    for (const def of injectResult.defs) {
      this.addDef(def)
    }

    document.defs.push(...injectResult.defs)
    document.typedElements.push(...injectResult.defs.map((def) => this.getTypedElements(def)).flat())

    // grab dirty nodes
    const dirtyNodes: Set<Def | TypedElement> = new Set()
    for (const def of removedDefs.concat(injectResult.defs)) {
      const defName = def.getDefName()
      const nameAttribute = def.getNameAttributeValue()

      if (defName) {
        for (const other of this.referenceResolveWanter.getValue(defName)) {
          dirtyNodes.add(other)
        }
      }

      if (nameAttribute) {
        for (const other of this.inheritResolveWanter.getValue(nameAttribute)) {
          dirtyNodes.add(other)
        }
      }
    }

    return [...dirtyNodes.values()]
  }

  private addDef(def: Def): void {
    this.defDatabase.addDef(def)
    this.nameDatabase.addDef(def)

    const typedNodes = this.getTypedElements(def)

    for (const typedNode of typedNodes) {
      if (this.isReferenceWanter(typedNode) && typedNode.content) {
        this.referenceResolveWanter.setValue(typedNode.content, typedNode)
      }
    }

    const parentName = def.getParentNameAttributeValue()
    if (this.isInheritWanter(def) && parentName) {
      this.inheritResolveWanter.setValue(parentName, def)
    }
  }

  private removeDef(def: Def): void {
    const parentName = def.getParentNameAttributeValue()

    if (parentName && this.isInheritWanter(def)) {
      this.inheritResolveWanter.remove(parentName, def)
    }

    const typedNodes = this.getTypedElements(def)

    for (const typedNode of typedNodes) {
      if (this.isReferenceWanter(typedNode) && typedNode.content) {
        this.referenceResolveWanter.remove(typedNode.content, typedNode)
      }
    }

    this.defDatabase.removeDef(def)
  }

  private getTypedElements(def: Def): TypedElement[] {
    const typedNodes: TypedElement[] = []

    const queue: Deque<Def | TypedElement> = new Deque([def])

    let typedNode: Def | TypedElement | undefined = undefined
    while ((typedNode = queue.dequeue())) {
      // Def should not added because only TypedElement (not Def) wants reference to be resolved.
      if (typedNode instanceof TypedElement) {
        typedNodes.push(typedNode)
      }

      for (const child of typedNode.ChildElementNodes) {
        if (child instanceof TypedElement) {
          queue.enqueue(child)
        }
      }
    }

    return typedNodes
  }

  private isReferenceWanter(typedElement: TypedElement): boolean {
    // why not typedElement.typeInfo ???
    const fieldInfo = typedElement.getFieldInfo()

    if (fieldInfo) {
      if (fieldInfo.fieldType.isDef()) {
        return true
      }

      // TODO: support for CompProperties_XXX or something else.
    } else if (typedElement.parent instanceof TypedElement && typedElement.parent.typeInfo.isList()) {
      if (typedElement.typeInfo.isDef()) {
        return true
      }
    }

    return false
  }

  private isInheritWanter(def: Def): boolean {
    const ParentNameAttribute = def.getParentNameAttributeValue()

    return !!ParentNameAttribute
  }
}
