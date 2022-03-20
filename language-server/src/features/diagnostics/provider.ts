import * as tsyringe from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Provider } from '../provider'

@tsyringe.injectable()
export class DiagnosticsProvider implements Provider {
  constructor() {}

  init(connection: Connection): void {
    throw new Error('Method not implemented.')
  }
}
