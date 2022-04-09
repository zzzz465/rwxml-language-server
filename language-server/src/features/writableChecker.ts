import { singleton } from 'tsyringe'
import { FileStore } from '../fileStore'
import { TextFile } from '../fs'
import { ModDependencyBags } from '../mod/modDependencyBags'

@singleton()
export class WritableChecker {
  constructor(private readonly fileStore: FileStore, private readonly modDepBags: ModDependencyBags) {}

  canWrite(uri: string): boolean {
    if (this.modDepBags.isDependencyFile(null, uri)) {
      return false
    }

    const file = this.fileStore.get(uri)
    if (!file) {
      return false
    }

    if (file instanceof TextFile && file.readonly) {
      return false
    }

    return true
  }
}
