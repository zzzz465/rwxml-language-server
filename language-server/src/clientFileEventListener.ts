import * as tsyringe from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import winston from 'winston'
import { ConnectionToken } from './connection'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './events'
import { FileStore } from './fileStore'
import defaultLogger, { className, logFormat } from './log'

@tsyringe.singleton()
export class ClientFileEventListener {
  private log = winston.createLogger({
    format: winston.format.combine(className(ClientFileEventListener), logFormat),
    transports: [defaultLogger()],
  })

  constructor(@tsyringe.inject(ConnectionToken) connection: Connection, private readonly fileStore: FileStore) {

    connection.onNotification(ProjectFileAdded, ({ uri }) => this.onFileAdded(uri))
    connection.onNotification(ProjectFileChanged, ({ uri }) => this.onFileChanged(uri))
    connection.onNotification(ProjectFileDeleted, ({ uri }) => this.onFileDeleted(uri))
  }

  private onFileAdded(uri: string) {
    const [, err] = this.fileStore.load({ uri: URI.parse(uri) })
    if (err) {
      this.log.error(`cannot add file. error: ${err.message}`)
      return
    }
  }

  private onFileChanged(uri: string) {
    const [, err] = this.fileStore.update(uri)
    if (err) {
      this.log.error(`cannot add file. error: ${err.message}`)
      return
    }
  }

  private onFileDeleted(uri: string) {
    const err = this.fileStore.unload(uri)
    if (err) {
      this.log.error(`cannot add file. error: ${err.message}`)
      return
    }
  }
}
