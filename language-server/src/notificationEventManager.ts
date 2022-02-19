import EventEmitter from 'events'
import { inject, singleton } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './events'
import { File } from './fs'
import * as winston from 'winston'
import { LogToken } from './log'

// events that this manager will emit
export interface NotificationEvents {
  fileAdded(file: File): void
  fileChanged(file: File): void
  fileDeleted(uri: string): void
}

@singleton()
export class NotificationEventManager {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${NotificationEventManager.name}] ${info.message}`
  )
  private readonly log: winston.Logger

  // pre-event stage emit
  public readonly preEvent: EventEmitter<NotificationEvents> = new EventEmitter()
  // event emit
  public readonly event: EventEmitter<NotificationEvents> = new EventEmitter()
  // post-event emit?

  constructor(@inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  listenConnection(connection: Connection): void {
    connection.onNotification(ProjectFileAdded, ({ uri }) => this.onFileAdded(this.toFile(uri)))
    connection.onNotification(ProjectFileChanged, ({ uri }) => this.onFileChanged(this.toFile(uri)))
    connection.onNotification(ProjectFileDeleted, ({ uri }) => this.onFileDeleted(uri))
  }

  listen(event: EventEmitter<NotificationEvents>): void {
    event.on('fileAdded', this.onFileAdded.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    event.on('fileDeleted', this.onFileDeleted.bind(this))
  }

  private toFile(uri: string): File {
    return File.create({ uri: URI.parse(uri) })
  }

  private onFileAdded(file: File): void {
    this.preEvent.emit('fileAdded', file)
    this.event.emit('fileAdded', file)
  }

  private onFileChanged(file: File): void {
    this.preEvent.emit('fileChanged', file)
    this.event.emit('fileChanged', file)
  }

  private onFileDeleted(uri: string): void {
    this.preEvent.emit('fileDeleted', uri)
    this.event.emit('fileDeleted', uri)
  }
}
