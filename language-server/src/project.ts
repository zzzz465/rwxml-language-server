import {} from 'rwxml-analyzer'
import { Disposable } from 'vscode-languageserver'
import { FileManager } from './fs/fileManager'

export class Project implements Disposable {
  // private readonly defDatabase = new
  private readonly fileManager = new FileManager()

  constructor(public readonly version: string) {}

  dispose() {
    this.fileManager.dispose()
  }
}
