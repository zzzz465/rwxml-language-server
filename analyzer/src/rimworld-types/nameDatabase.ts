import { Def } from './def'
import { MultiDictionary } from 'typescript-collections'

export class NameDatabase {
  private inheritNames: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)
  private uriToInheritNames: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)

  addDef(def: Def): boolean {
    const inheritName = def.getInheritName()

    if (inheritName) {
      this.inheritNames.setValue(inheritName, def)
      this.uriToInheritNames.setValue(def.document.uri, def)

      return true
    } else {
      return false
    }
  }

  getDef(inheritName: string): Def[] {
    return this.inheritNames.getValue(inheritName)
  }

  getDefByUri(uri: string): Def[] {
    return this.uriToInheritNames.getValue(uri)
  }

  removeDef(def: Def): void {
    const inheritName = def.getInheritName()

    if (inheritName) {
      this.inheritNames.remove(inheritName, def)
      this.uriToInheritNames.remove(def.document.uri, def)
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
