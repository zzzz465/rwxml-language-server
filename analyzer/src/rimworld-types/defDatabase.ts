import { Def } from './def'
import { MultiDictionary } from 'typescript-collections'

export class DefDatabase {
  private defs: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)

  addDef(defName: string, def: Def): void {
    this.defs.setValue(defName, def)
  }

  getDef(defName: string): Def[] {
    return this.defs.getValue(defName)
  }

  removeDef(defName: string, def: Def): boolean {
    return this.defs.remove(defName, def)
  }
}
