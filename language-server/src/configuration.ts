import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import * as ls from 'vscode-languageserver'

type Events = {
  onConfigurationChanged(): void
}

@tsyringe.singleton()
export class Configuration {
  private connection?: ls.Connection

  readonly events = new EventEmitter() as TypedEventEmitter<Events>

  private cache: Map<string, any> = new Map()

  private initialized = false

  init(connection: ls.Connection): void {
    if (!this.initialized) {
      this.connection = connection
      connection.onDidChangeConfiguration(this.onConfigurationChanged.bind(this))
      this.initialized = true
    }
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
