import { Def } from './def'
import { MultiDictionary } from 'typescript-collections'

export class DefDatabase {
  private defs: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)
  private uriToDef: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)

  addDef(defName: string, def: Def): void {
    this.defs.setValue(defName, def)
    this.uriToDef.setValue(def.document.uri, def)
  }

  getDef(defName: string): Def[] {
    return this.defs.getValue(defName)
  }

  getDefByUri(uri: string): Def[] {
    return this.uriToDef.getValue(uri)
  }

  removeDef(defName: string, def: Def): void {
    this.defs.remove(defName, def)
    this.uriToDef.remove(def.document.uri, def)
  }
}
