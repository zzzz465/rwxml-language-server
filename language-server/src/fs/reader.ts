import ono from 'ono'
import { inject, injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import * as winston from 'winston'
import { ConnectionToken } from '../connection'
import { TextRequest } from '../events'
import defaultLogger, { withClass } from '../log'
import { File } from './file'

@injectable()
export class TextReader {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(TextReader)),
    transports: [defaultLogger()],
  })

  constructor(@inject(ConnectionToken) private readonly connection: Connection) {}

  async read(file: File): Promise<string | Error> {
    this.log.silly(`read file: ${file.uri.toString()}`)

    try {
      const { data } = await this.connection.sendRequest(TextRequest, { uri: file.uri.toString() })
      return data
    } catch (err) {
      return ono(err as any, `failed to read file: ${file.uri.toString()}`)
    }
  }
}
