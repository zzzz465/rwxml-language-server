import ono from 'ono'
import * as tsyringe from 'tsyringe'
import { FileStore } from './fileStore'
import { TextFile } from './fs'
import { Result } from './types/functional'

interface Data {
  updatedAt: number
  value: string
}

@tsyringe.singleton()
export class TextStore {
  // Map<uri, content>
  private texts: Map<string, Data> = new Map()

  constructor(private readonly fileStore: FileStore) {
    fileStore.event.on('fileDeleted', (uri) => this.onFileDeleted(uri))
  }

  async getText(uri: string): Promise<Result<string | null, Error>> {
    const file = this.fileStore.get(uri)
    if (!file) {
      return [null, ono(`file not exists. uri: ${uri}`)]
    } else if (!(file instanceof TextFile)) {
      return [null, ono(`file is not TextFile. uri: ${uri}`)]
    }

    let data = this.texts.get(uri)
    if (!data || data.updatedAt < file.updatedAt) {
      await this.updateText(file)
    }

    data = this.texts.get(uri)
    if (!data) {
      return [null, ono(`(panic) text not registered after updateText. uri: ${uri}`)]
    }

    return [data.value, null]
  }

  private async updateText(file: TextFile): Promise<void> {
    const uri = file.uri.toString()

    let data = this.texts.get(uri)
    if (!data) {
      data = { updatedAt: 0, value: '' }
      this.texts.set(uri, data)
    }

    const value = await file.read()
    if (data.updatedAt < file.updatedAt) {
      data.updatedAt = file.updatedAt
      data.value = value
    }
  }

  private onFileDeleted(uri: string): void {
    if (this.texts.has(uri)) {
      this.texts.delete(uri)
    }
  }
}
