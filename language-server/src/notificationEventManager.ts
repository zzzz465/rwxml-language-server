import EventEmitter from 'events'
import { singleton } from 'tsyringe'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import {
  ProjectFileAdded,
  ProjectFileAddedNotificationParams,
  ProjectFileChanged,
  ProjectFileChangedNotificationParams,
  ProjectFileDeleted,
  ProjectFileDeletedNotificationParams,
} from './events'
import { File } from './fs'
import * as winston from 'winston'

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
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  // pre-event stage emit
  public readonly preEvent: EventEmitter<NotificationEvents> = new EventEmitter()
  // event emit
  public readonly event: EventEmitter<NotificationEvents> = new EventEmitter()
  // post-event emit?

  listen(connection: Connection): void {
    connection.onNotification(ProjectFileAdded, this.onProjectFileAdded.bind(this))
    connection.onNotification(ProjectFileChanged, this.onProjectFileChanged.bind(this))
    connection.onNotification(ProjectFileDeleted, this.onProjectFileDeleted.bind(this))
  }

  private onProjectFileAdded({ uri }: ProjectFileAddedNotificationParams): void {
    this.log.debug(`project file added: ${uri}`)

    const file = File.create({ uri: URI.parse(uri) })
    this.preEvent.emit('fileAdded', file)
    this.event.emit('fileAdded', file)
  }

  private onProjectFileChanged({ uri }: ProjectFileChangedNotificationParams): void {
    this.log.debug(`project file changed: ${uri}`)

    const file = File.create({ uri: URI.parse(uri) })
    this.preEvent.emit('fileChanged', file)
    this.event.emit('fileChanged', file)
  }

  private onProjectFileDeleted({ uri }: ProjectFileDeletedNotificationParams): void {
    this.log.debug(`project file deleted: ${uri}`)

    this.preEvent.emit('fileDeleted', uri)
    this.event.emit('fileDeleted', uri)
  }
}
