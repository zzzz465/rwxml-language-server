import { inject, injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { TextRequest } from '../events'
import { File } from './file'
import * as winston from 'winston'
import { ConnectionToken } from '../connection'

@injectable()
export class TextReader {
  private logFormat = winston.format.printf((info) => `[${TextReader.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(@inject(ConnectionToken) private readonly connection: Connection) {
    this.log = winston.createLogger({
      transports: [new winston.transports.Console()],
      format: this.logFormat,
    })
  }

  async read(file: File): Promise<string> {
    this.log.silly(`read file: ${file.uri.toString()}`)

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
