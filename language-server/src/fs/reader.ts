import { injectable } from 'tsyringe'
import { File } from './file'

@injectable()
export class XMLFileReader {
  async read(file: File): Promise<string> {
    throw new Error('not implemented')
  }
}
