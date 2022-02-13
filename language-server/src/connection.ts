import { inject, singleton } from 'tsyringe'
import { Connection } from 'vscode-languageserver'

@singleton()
export class ConnectionWrapper {
  private _initialized = false
  get initialized() {
    return this._initialized
  }

  private cbs: ((_: unknown) => void)[] = []

  constructor(@inject('connection') public readonly connection: Connection) {
    connection.onInitialized(this.onInitialized.bind(this))
  }

  private onInitialized() {
    this._initialized = true

    for (const cb of this.cbs) {
      cb(undefined)
    }
  }

  async waitInitialization() {
    if (!this.initialized) {
      return new Promise((res) => {
        this.cbs.push(res)
      })
    }
  }
}
