import * as tsyringe from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import winston from 'winston'
import { ConnectionToken } from './connection'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './events'
import { FileStore } from './fileStore'
import { LogToken } from './log'

@tsyringe.singleton()
export class ClientFileEventListener {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${ClientFileEventListener.name}] ${info.message}`
  )
  private readonly log: winston.Logger

  constructor(
    @tsyringe.inject(ConnectionToken) connection: Connection,
    private readonly fileStore: FileStore,
    @tsyringe.inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = baseLogger.child({ format: this.logFormat })

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
    const err = this.fileStore.delete(uri)
    if (err) {
      this.log.error(`cannot add file. error: ${err.message}`)
      return
    }
  }
}
