import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import { File } from './fs'
import defaultLogger, { withClass } from './log'

// events that this manager will emit
export type NotificationEvents = {
  fileAdded(file: File): void
  fileChanged(file: File): void
  fileDeleted(uri: string): void
}

/**
 * NotificationEventManager spread various events in pre/main/post step.
 */
@tsyringe.singleton()
export class NotificationEventManager {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(NotificationEventManager)),
    transports: [defaultLogger()],
  })

  // pre-event stage emit
  readonly preEvent = new EventEmitter() as TypedEventEmitter<NotificationEvents>
  // event emit
  readonly event = new EventEmitter() as TypedEventEmitter<NotificationEvents>
  // post-event emit?
  readonly postEvent = new EventEmitter() as TypedEventEmitter<NotificationEvents>

  listen(event: TypedEventEmitter<NotificationEvents>): void {
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
    this.postEvent.emit('fileAdded', file)
  }

  private onFileChanged(file: File): void {
    this.preEvent.emit('fileChanged', file)
    this.event.emit('fileChanged', file)
    this.postEvent.emit('fileChanged', file)
  }

  private onFileDeleted(uri: string): void {
    this.preEvent.emit('fileDeleted', uri)
    this.event.emit('fileDeleted', uri)
    this.postEvent.emit('fileDeleted', uri)
  }
}
