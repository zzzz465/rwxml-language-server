import { singleton } from 'tsyringe'
import { DependencyResourceManager } from '../dependencyResourceManager'
import { FileStore } from '../fileStore'
import { TextFile } from '../fs'

@singleton()
export class Writable {
  constructor(private readonly fileStore: FileStore, private readonly depManager: DependencyResourceManager) {}

  canWrite(uri: string): boolean {
    if (this.depManager.isDependencyFile(uri)) {
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
