import { injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Provider } from './provider'
import * as winston from 'winston'

@injectable()
export class HoverProvider extends Provider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${HoverProvider.name}] ${info.message}`)
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  protected getLogger(): winston.Logger {
    return this.log
  }

  listen(connection: Connection): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
