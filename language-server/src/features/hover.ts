import { injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Provider } from './provider'

@injectable()
export class HoverProvider implements Provider {
  listen(connection: Connection): void {
    throw new Error('Method not implemented.')
  }
}
