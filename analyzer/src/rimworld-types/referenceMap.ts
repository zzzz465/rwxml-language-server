import { DefaultDictionary, MultiDictionary } from 'typescript-collections'
import { Def } from './def'

export class ReferenceMap {
  private defs: DefaultDictionary<string, MultiDictionary<string, Def>>

  constructor() {
    this.defs = new DefaultDictionary(() => new MultiDictionary())
  }

  addDef(defType: string, name: string, def: Def) {
    const defDictionary = this.defs.getValue(defType)
    defDictionary.setValue(name, def)
  }

  getDef(defType: string, name: string) {
    const defDictionary = this.defs.getValue(defType)
    return defDictionary.getValue(name)
  }

  removeDef(defType: string, name: string, def: Def) {
    const defDictionary = this.defs.getValue(defType)
    return defDictionary.remove(name, def)
  }

  dispose() {
    this.defs.clear()
  }
}
