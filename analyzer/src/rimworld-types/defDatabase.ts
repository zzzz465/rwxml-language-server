import { Def } from './def'
import { DefaultDictionary, MultiDictionary } from 'typescript-collections'

export class DefDatabase implements Iterable<Def> {
  // store defs sorted by defType
  private _defs: DefaultDictionary<string, MultiDictionary<string, Def>> = new DefaultDictionary(
    () => new MultiDictionary()
  )
  // sort defs by uri
  private _uriToDef: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)
  // only store defs by defName
  private _unsortedDefs: MultiDictionary<string, Def> = new MultiDictionary()

  addDef(def: Def): boolean {
    const defType = def.getDefType()
    const defName = def.getDefName()

    if (defName) {
      this._defs.getValue(defType).setValue(defName, def)
      this._uriToDef.setValue(def.document.uri, def)
      this._unsortedDefs.setValue(defName, def)

      return true
    } else {
      return false
    }
  }

  getDef(defType: string, defName?: string): Def[] {
    const defTypeDict = this._defs.getValue(defType)
    if (defName) {
      return defTypeDict.getValue(defName)
    } else {
      return defTypeDict.values()
    }
  }

  getDefByUri(uri: string): Def[] {
    return this._uriToDef.getValue(uri)
  }

  getDefByName(defName: string): Def[] {
    return this._unsortedDefs.getValue(defName)
  }

  removeDef(def: Def): Def {
    const defType = def.getDefType()
    const defName = def.getDefName()

    if (defName) {
      const defTypeDict = this._defs.getValue(defType)
      defTypeDict.remove(defName, def)
      this._uriToDef.remove(def.document.uri, def)
      this._unsortedDefs.remove(defName, def)
    }

    return def
  }

  removeAllDefsByUri(uri: string): Def[] {
    const defs = this.getDefByUri(uri)
    for (const def of defs) {
      this.removeDef(def)
    }

    return defs
  }

  /**
   * @returns all defs in DefDatabase
   */
  defs(): Iterable<Def> {
    return this
  }

  [Symbol.iterator](): Iterator<Def, any, undefined> {
    return this._unsortedDefs.values()[Symbol.iterator]()
  }
}
