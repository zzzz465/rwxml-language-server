import { Def } from './def'
import { DefaultDictionary, MultiDictionary } from 'typescript-collections'
import { from } from 'linq-es2015'

export class NameDatabase {
  private inheritNames: DefaultDictionary<string, MultiDictionary<string, Def>> = new DefaultDictionary(
    () => new MultiDictionary()
  )
  private uriToInheritNames: MultiDictionary<string, Def> = new MultiDictionary(undefined, undefined, true)

  addDef(def: Def): boolean {
    const inheritName = def.getNameAttributeValue()
    const defType = def.getDefType()

    if (inheritName) {
      this.inheritNames.getValue(defType).setValue(inheritName, def)
      this.uriToInheritNames.setValue(def.document.uri, def)

      return true
    } else {
      return false
    }
  }

  getDef(defType: string | null, name: string | null): Def[] {
    if (defType) {
      const target = this.inheritNames.getValue(defType)

      if (name) {
        return target.getValue(name)
      } else {
        return target.values()
      }
    } else {
      if (name) {
        return from(this.inheritNames.values())
          .SelectMany((dict) => dict.getValue(name))
          .ToArray()
      } else {
        return from(this.inheritNames.values())
          .SelectMany((dict) => dict.values())
          .ToArray()
      }
    }
  }

  getDefByUri(uri: string): Def[] {
    return this.uriToInheritNames.getValue(uri)
  }

  removeDef(def: Def): Def {
    const inheritName = def.getNameAttributeValue()
    const defType = def.getDefType()

    if (inheritName) {
      this.inheritNames.getValue(defType).remove(inheritName, def)
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
