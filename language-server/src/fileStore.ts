import EventEmitter from 'events'
import { singleton } from 'tsyringe'
import { File } from './fs'
import { NotificationEventManager, NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'

type Events = Omit<NotificationEvents, 'fileChanged'>

@singleton()
export class FileStore {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${FileStore.name}] ${info.message}`)
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  public readonly event: EventEmitter<Events> = new EventEmitter()

  private readonly files: Map<string, File> = new Map()

  constructor(notiEventManager: NotificationEventManager) {
    notiEventManager.event.on('fileAdded', this.onFileAdded.bind(this))
    notiEventManager.event.on('fileChanged', this.onFileChanged.bind(this))
    notiEventManager.event.on('fileDeleted', this.onFileDeleted.bind(this))
  }

  get(uri: string) {
    return this.files.get(uri)
  }

  has(key: string): boolean {
    return this.files.has(key)
  }

  entries(): IterableIterator<[string, File]> {
    return this.files.entries()
  }

  keys(): IterableIterator<string> {
    return this.files.keys()
  }

  values(): IterableIterator<File> {
    return this.files.values()
  }

  [Symbol.iterator](): IterableIterator<[string, File]> {
    return this.files[Symbol.iterator]()
  }

  private onFileAdded(file: File) {
    this.files.set(file.uri.toString(), file)
  }

  private onFileChanged(file: File) {
    this.files.set(file.uri.toString(), file)
  }

  private onFileDeleted(uri: string) {
    this.files.delete(uri)
  }
}