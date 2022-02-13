import { injectable } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { TextRequest } from '../events'
import { File } from './file'

@injectable()
export class TextReader {
  constructor(private readonly connection: Connection) {}

  async read(file: File): Promise<string> {
    const { data, error } = await this.connection.sendRequest(TextRequest, {
      uri: file.uri.toString(),
    })

    if (error) {
      throw new Error(error)
    }

    return data
  }
}
