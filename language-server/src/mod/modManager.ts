import { Connection } from 'vscode-languageserver'
import { ModChangedNotification, ModChangedNotificationParams } from '../events'
import { Mod } from './mod'

export class ModManager {
  private readonly _mods = new Map<string, Mod>()
  get packageIds(): string[] {
    return [...this._mods.keys()]
  }

  get mods(): Mod[] {
    return [...this._mods.values()]
  }

  listen(connection: Connection) {
    connection.onNotification(ModChangedNotification, this.onModChanged.bind(this))
  }

  onModChanged({ mods }: ModChangedNotificationParams) {
    this._mods.clear()
    for (const mod of mods) {
      this._mods.set(mod.about.packageId, new Mod(mod.about))
    }
  }
}
