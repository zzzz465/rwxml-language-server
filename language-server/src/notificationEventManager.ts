import EventEmitter from 'events'
import { singleton } from 'tsyringe'
import { Connection, TextDocumentChangeEvent } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
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
  contentChanged(file: File): void
}

interface TextDocumentListeningEvent {
  onContentChange(e: TextDocumentChangeEvent<TextDocument>): void
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

  listen(connection: Connection, textDocumentEvent: EventEmitter<TextDocumentListeningEvent>): void {
    connection.onNotification(ProjectFileAdded, this.onProjectFileAdded.bind(this))
    connection.onNotification(ProjectFileChanged, this.onProjectFileChanged.bind(this))
    connection.onNotification(ProjectFileDeleted, this.onProjectFileDeleted.bind(this))
    textDocumentEvent.on('onContentChange', this.onContentChanged.bind(this))
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

  private onContentChanged({ document }: TextDocumentChangeEvent<TextDocument>): void {
    this.log.debug(`project file content changed: ${document.uri.toString()}`)

    const file = File.create({ uri: URI.parse(document.uri) })
    this.preEvent.emit('contentChanged', file)
    this.event.emit('contentChanged', file)
  }
}
