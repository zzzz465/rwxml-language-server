import { injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { Provider } from './provider'
import * as winston from 'winston'
import * as ls from 'vscode-languageserver'

@injectable()
export class HoverProvider extends Provider {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${HoverProvider.name}] ${info.message}`)
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  protected getLogger(): winston.Logger {
    return this.log
  }

  listen(connection: Connection): void {
    connection.onHover(this.wrapExceptionStackTraces(this.onHover.bind(this)))
  }

  private onHover(p: ls.HoverParams): Promise<ls.Hover | undefined | null> {
    throw new Error('method not implemented')
  }
}
