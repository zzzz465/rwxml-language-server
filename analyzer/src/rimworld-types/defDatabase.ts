import { Def } from './def'
import { DefaultDictionary, MultiDictionary } from 'typescript-collections'

export class DefDatabase {
  // store defs sorted by defType
  private defs: DefaultDictionary<string, MultiDictionary<string, Def>> = new DefaultDictionary(
    () => new MultiDictionary()
  )
  // sort defs by uri
  private uriToDef: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)
  // only store defs by defName
  private unsortedDefs: MultiDictionary<string, Def> = new MultiDictionary()

  addDef(def: Def): boolean {
    const defType = def.getDefType()
    const defName = def.getDefName()

    if (defName) {
      this.defs.getValue(defType).setValue(defName, def)
      this.uriToDef.setValue(def.document.uri, def)
      this.unsortedDefs.setValue(defName, def)

      return true
    } else {
      return false
    }
  }

  getDef(defType: string, defName?: string): Def[] {
    const defTypeDict = this.defs.getValue(defType)
    if (defName) {
      return defTypeDict.getValue(defName)
    } else {
      return defTypeDict.values()
    }
  }

  getDefByUri(uri: string): Def[] {
    return this.uriToDef.getValue(uri)
  }

  getDefByName(defName: string): Def[] {
    return this.unsortedDefs.getValue(defName)
  }

  removeDef(def: Def): Def {
    const defType = def.getDefType()
    const defName = def.getDefName()

    if (defName) {
      const defTypeDict = this.defs.getValue(defType)
      defTypeDict.remove(defName, def)
      this.uriToDef.remove(def.document.uri, def)
      this.unsortedDefs.remove(defName, def)
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
}
