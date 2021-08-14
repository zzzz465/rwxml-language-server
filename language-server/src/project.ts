import { DefDatabase, ReferenceMap, InheritMap, TypeInfoInjector } from 'rwxml-analyzer'
import { Disposable } from 'vscode-languageserver'
import { FileManager } from './fs/fileManager'

export class Project implements Disposable {
  private readonly defDatabase = new DefDatabase()
  private readonly referenceMap = new ReferenceMap()
  private readonly inheritMap = new InheritMap()
  private readonly fileManager = new FileManager()

  constructor(public readonly version: string, private readonly typeInfoInjector: TypeInfoInjector) {}

  dispose() {
    this.fileManager.dispose()
  }
}
