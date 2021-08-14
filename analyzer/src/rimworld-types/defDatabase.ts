import { Def } from './def'
import { MultiDictionary } from 'typescript-collections'

export class DefDatabase {
  private defs: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)
  private uriToDef: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)

  addDef(def: Def): boolean {
    const defName = def.getDefName()

    if (defName) {
      this.defs.setValue(defName, def)
      this.uriToDef.setValue(def.document.uri, def)

      return true
    } else {
      return false
    }
  }

  getDef(defName: string): Def[] {
    return this.defs.getValue(defName)
  }

  getDefByUri(uri: string): Def[] {
    return this.uriToDef.getValue(uri)
  }

  removeDef(def: Def): void {
    const defName = def.getDefName()

    if (defName) {
      this.defs.remove(defName, def)
      this.uriToDef.remove(def.document.uri, def)
    } else {
      throw new Error()
    }
  }

  removeAllDefsByUri(uri: string): void {
    for (const def of this.getDefByUri(uri)) {
      this.removeDef(def)
    }
  }
}
