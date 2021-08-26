import Deque from 'double-ended-queue'
import _ from 'lodash'
import {
  DefDatabase,
  TypeInfoInjector,
  Def,
  NameDatabase,
  Injectable,
  TypeInfoMap,
  TypeInfo,
  Document,
} from '@rwxml/analyzer'
import { MultiDictionary } from 'typescript-collections'

export class DefManager {
  private referenceResolveWanter: MultiDictionary<string, Injectable> = new MultiDictionary(undefined, undefined, true) // defName, Injectable
  private inheritResolveWanter: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true) // ParentName, Injectable
  private defType: TypeInfo

  constructor(
    private readonly defDatabase: DefDatabase,
    private readonly nameDatabase: NameDatabase,
    private readonly typeInfoMap: TypeInfoMap,
    private readonly typeInfoInjector: TypeInfoInjector
  ) {
    const defType = typeInfoMap.getTypeInfoByName('Def')
    if (defType) {
      this.defType = defType
    } else {
      throw new Error('cannot find def Type in typeInfoMap')
    }
  }

  getDef(defType: string, defName?: string): Def[] {
    return this.defDatabase.getDef(defType, defName)
  }

  /**
   * @returns dirty nodes that require re-evaluation
   */
  update(document: Document): Injectable[] {
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

    // grab dirty nodes
    const dirtyInjectables: Set<Injectable> = new Set()
    for (const def of removedDefs.concat(injectResult.defs)) {
      const defName = def.getDefName()
      const nameAttribute = def.getNameAttributeValue()

      if (defName) {
        for (const other of this.referenceResolveWanter.getValue(defName)) {
          dirtyInjectables.add(other)
        }
      }

      if (nameAttribute) {
        for (const other of this.inheritResolveWanter.getValue(nameAttribute)) {
          dirtyInjectables.add(other)
        }
      }
    }

    return [...dirtyInjectables.values()]
  }

  private addDef(def: Def): void {
    this.defDatabase.addDef(def)
    this.nameDatabase.addDef(def)

    const injectables = this.getInjectables(def)

    for (const injectable of injectables) {
      if (this.isReferenceWanter(injectable) && injectable.content) {
        this.referenceResolveWanter.setValue(injectable.content, injectable)
      }
    }

    const parentName = def.getParentNameAttributeValue()
    if (this.isInheritWanter(def) && parentName) {
      this.inheritResolveWanter.setValue(parentName, def)
    }
  }

  private removeDef(def: Def) {
    const parentName = def.getParentNameAttributeValue()

    if (parentName && this.isInheritWanter(def)) {
      this.inheritResolveWanter.remove(parentName, def)
    }

    const injectables = this.getInjectables(def)

    for (const injectable of injectables) {
      if (this.isReferenceWanter(injectable) && injectable.content) {
        this.referenceResolveWanter.remove(injectable.content, injectable)
      }
    }

    this.defDatabase.removeDef(def)
  }

  private getInjectables(def: Def): Injectable[] {
    const injectables: Injectable[] = []

    const queue: Deque<Injectable> = new Deque([def])

    let injectable: Injectable | undefined = undefined
    while (!!(injectable = queue.dequeue())) {
      injectables.push(injectable)

      for (const child of injectable.ChildElementNodes) {
        if (child instanceof Injectable) {
          queue.enqueue(child)
        }
      }
    }

    return injectables
  }

  private isReferenceWanter(injectable: Injectable): boolean {
    const fieldInfo = injectable.getFieldInfo()

    if (fieldInfo) {
      if (fieldInfo.fieldType.isDef()) {
        return true
      }

      // TODO: support for CompProperties_XXX or something else.
    }

    return false
  }

  private isInheritWanter(def: Def): boolean {
    const ParentNameAttribute = def.getParentNameAttributeValue()

    return !!ParentNameAttribute
  }
}
