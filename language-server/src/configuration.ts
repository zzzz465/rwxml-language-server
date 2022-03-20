import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'

@tsyringe.singleton()
export class Configuration {
  private connection?: ls.Connection

  private cache: Map<string, any> = new Map()

  init(connection: ls.Connection): void {
    this.connection = connection
    connection.onDidChangeConfiguration(this.onConfigurationChanged.bind(this))
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.connection) {
      // TODO: add warning
      return
    }

    if (!this.cache.has(key)) {
      const value = this.connection.workspace.getConfiguration(key)
      this.cache.set(key, value)
    }

    return this.cache.get(key)
  }

  private onConfigurationChanged(): void {
    this.cache.clear()
  }
}
