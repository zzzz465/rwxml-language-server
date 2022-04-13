import Deque from 'double-ended-queue'
import _ from 'lodash'
import {
  DefDatabase,
  TypeInfoInjector,
  Def,
  NameDatabase,
  Injectable,
  TypeInfoMap,
  isDerivedType,
} from '@rwxml/analyzer'
import { MultiDictionary } from 'typescript-collections'
import * as winston from 'winston'
import { RimWorldVersion } from './RimWorldVersion'
import { DocumentWithNodeMap } from './documentWithNodeMap'

export class DefManager {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${DefManager.name}] [${this.version}] ${info.message}`
  )
  private readonly log: winston.Logger

  private referenceResolveWanter: MultiDictionary<string, Injectable> = new MultiDictionary(undefined, undefined, true) // defName, Injectable
  private inheritResolveWanter: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true) // ParentName, Injectable
  private readonly typeInfoInjector: TypeInfoInjector

  constructor(
    public readonly defDatabase: DefDatabase,
    public readonly nameDatabase: NameDatabase,
    public readonly typeInfoMap: TypeInfoMap,
    public readonly version?: RimWorldVersion
  ) {
    this.log = winston.createLogger({
      transports: [new winston.transports.Console()],
      format: this.logFormat,
    })

    const defType = typeInfoMap.getTypeInfoByName('Def')
    if (!defType) {
      // eslint-disable-next-line quotes
      this.log.warn("cannot find type Def in typeInfoMap. something isn't right.")
      // throw new Error('cannot find def Type in typeInfoMap')
    }

    this.typeInfoInjector = new TypeInfoInjector(typeInfoMap)
  }

  getReferenceResolveWanters(defName: string): Injectable[] {
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
  getDef(
    defType: string,
    defName: string | undefined = undefined,
    resolveBaseType = true
  ): Def[] | 'DEFTYPE_NOT_EXIST' {
    if (defName && resolveBaseType) {
      return this.getDefByDefName(defType, defName)
    }

    return this.defDatabase.getDef(defType, defName)
  }

  private getDefByDefName(defType: string, defName: string): Def[] | 'DEFTYPE_NOT_EXIST' {
    const baseType = this.typeInfoMap.getTypeInfoByName(defType)
    if (!baseType) {
      return 'DEFTYPE_NOT_EXIST'
    }

    const defs = this.defDatabase.getDefByName(defName)
    return defs.filter((def) => isDerivedType(def.typeInfo, baseType))
  }

  /**
   * @returns dirty nodes that require re-evaluation. (only referenced injectables/defs are returned)
   */
  update(document: DocumentWithNodeMap): (Injectable | Def)[] {
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
    document.injectables.push(...injectResult.defs.map((def) => this.getInjectables(def)).flat())

    // grab dirty nodes
    const dirtyInjectables: Set<Def | Injectable> = new Set()
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

    const queue: Deque<Def | Injectable> = new Deque([def])

    let injectable: Def | Injectable | undefined = undefined
    while (!!(injectable = queue.dequeue())) {
      // Def should not added because only Injectables (not Def) wants reference to be resolved.
      if (injectable instanceof Injectable) {
        injectables.push(injectable)
      }

      for (const child of injectable.ChildElementNodes) {
        if (child instanceof Injectable) {
          queue.enqueue(child)
        }
      }
    }

    return injectables
  }

  private isReferenceWanter(injectable: Injectable): boolean {
    // why not injectable.typeInfo ???
    const fieldInfo = injectable.getFieldInfo()

    if (fieldInfo) {
      if (fieldInfo.fieldType.isDef()) {
        return true
      }

      // TODO: support for CompProperties_XXX or something else.
    } else if (injectable.parent instanceof Injectable && injectable.parent.typeInfo.isList()) {
      if (injectable.typeInfo.isDef()) {
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
