import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'

interface Events {
  onConfigurationChanged(): void
}

@tsyringe.singleton()
export class Configuration {
  private connection?: ls.Connection

  readonly events: EventEmitter<Events> = new EventEmitter()

  private cache: Map<string, any> = new Map()

  init(connection: ls.Connection): void {
    this.connection = connection
    connection.onDidChangeConfiguration(this.onConfigurationChanged.bind(this))
  }

  async get<T>(item: ls.ConfigurationItem): Promise<T | undefined> {
    if (!this.connection) {
      // TODO: add warning
      return
    }

    const key = `${item.scopeUri}#${item.section}`

    if (!this.cache.has(key)) {
      const value = await this.connection.workspace.getConfiguration(item)
      this.cache.set(key, value)
    }

    return this.cache.get(key)
  }

  private onConfigurationChanged(): void {
    this.cache.clear()
    this.events.emit('onConfigurationChanged')
  }
}
