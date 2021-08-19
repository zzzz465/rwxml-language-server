import { Def } from './def'
import { DefaultDictionary, MultiDictionary } from 'typescript-collections'

export class DefDatabase {
  private defs: DefaultDictionary<string, MultiDictionary<string, Def>> = new DefaultDictionary(
    () => new MultiDictionary()
  )
  private uriToDef: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)

  addDef(def: Def): boolean {
    const defType = def.getDefType()
    const defName = def.getDefName()

    if (defName) {
      this.defs.getValue(defType).setValue(defName, def)
      this.uriToDef.setValue(def.document.uri, def)

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

  removeDef(def: Def): Def {
    const defType = def.getDefType()
    const defName = def.getDefName()

    if (defName) {
      const defTypeDict = this.defs.getValue(defType)
      defTypeDict.remove(defName, def)
      this.uriToDef.remove(def.document.uri, def)

      return def
    } else {
      throw new Error()
    }
  }

  removeAllDefsByUri(uri: string): Def[] {
    const defs = this.getDefByUri(uri)
    for (const def of defs) {
      this.removeDef(def)
    }

    return defs
  }
}
