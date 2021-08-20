import { Def } from './def'
import { MultiDictionary } from 'typescript-collections'

export class NameDatabase {
  private inheritNames: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)
  private uriToInheritNames: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)

  addDef(def: Def): boolean {
    const inheritName = def.getNameAttributeValue()

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

  removeDef(def: Def): Def {
    const inheritName = def.getNameAttributeValue()

    if (inheritName) {
      this.inheritNames.remove(inheritName, def)
      this.uriToInheritNames.remove(def.document.uri, def)
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
