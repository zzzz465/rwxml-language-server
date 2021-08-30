import { Connection } from 'vscode-languageserver'
import { ModChangedNotification, ModChangedNotificationParams } from '../fs'
import { Mod, SerializedAbout } from './mod'

export class ModManager {
  private readonly mods = new Map<string, Mod>()

  listen(connection: Connection) {
    connection.onNotification(ModChangedNotification, this.onModChanged.bind(this))
  }

  onModChanged({ mods }: ModChangedNotificationParams) {
    this.mods.clear()
    for (const mod of mods) {
      this.mods.set(mod.about.packageId, new Mod(mod.about))
    }
  }
}
