import { inject, injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { TextRequest } from '../events'
import { File } from './file'
import * as winston from 'winston'
import { ConnectionToken } from '../connection'
import { LogToken } from '../log'

@injectable()
export class TextReader {
  private logFormat = winston.format.printf((info) => `[${TextReader.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(
    @inject(ConnectionToken) private readonly connection: Connection,
    @inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  async read(file: File): Promise<string> {
    this.log.silly(`read file: ${file.toString()}`)

    const { data, error } = await this.connection.sendRequest(TextRequest, {
      uri: file.uri.toString(),
    })

    if (error) {
      this.log.error(`request failed, error: ${error}`)
      throw error
    }

    return data
  }
}
