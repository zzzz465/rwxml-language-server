import { inject, injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { TextRequest } from '../events'
import { File } from './file'
import * as winston from 'winston'
import { ConnectionToken } from '../connection'

@injectable()
export class TextReader {
  private logFormat = winston.format.printf((info) => `[${TextReader.name}] ${info.message}`)
  private readonly log = winston.createLogger({ transports: log, format: this.logFormat })

  constructor(@inject(ConnectionToken) private readonly connection: Connection) {}

  async read(file: File): Promise<string> {
    this.log.debug(`read file: ${file.toString()}`)

    const { data, error } = await this.connection.sendRequest(TextRequest, {
      uri: file.uri.toString(),
    })

    if (error) {
      this.log.error(`request failed, error: ${error}`)
      throw new Error(error)
    }

    return data
  }
}
