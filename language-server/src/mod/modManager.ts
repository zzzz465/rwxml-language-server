import { singleton } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Mod } from './mod'

// FIXME: fix mod manager
@singleton()
export class ModManager {
  private readonly _mods = new Map<string, Mod>()
  get packageIds(): string[] {
    return [...this._mods.keys()]
  }

  get mods(): Mod[] {
    return [...this._mods.values()]
  }

  listen(connection: Connection): void {
    // connection.onNotification(ModChangedNotification, this.onModChanged.bind(this))
  }

  // onModChanged({ mods }: ModChangedNotificationParams) {
  //   this._mods.clear()
  //   for (const mod of mods) {
  //     this._mods.set(mod.about.packageId, new Mod(mod.about))
  //   }
  // }
}
