import EventEmitter from 'events'
import { inject, singleton } from 'tsyringe'
import { File, FileCreateParameters } from './fs'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'
import { LogToken } from './log'
import TypedEventEmitter from 'typed-emitter'
import { DefaultDictionary } from 'typescript-collections'

type Events = Omit<NotificationEvents, 'fileChanged'>

@singleton()
export class FileStore {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${FileStore.name}] ${info.message}`)
  private readonly log: winston.Logger

  public readonly event = new EventEmitter() as TypedEventEmitter<Events>

  private readonly files: Map<string, File> = new Map()
  private readonly referenceCounter: DefaultDictionary<string, number> = new DefaultDictionary(() => 0)

  constructor(@inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
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

  load(params: FileCreateParameters): [File?, Error?] {
    const file = File.create(params)

    if (this.files.has(file.uri.toString())) {
      return [file, new Error(`trying to add file but it already exists. uri: ${file.uri.toString()}`)]
    }

    this.log.silly(`file added: ${file.uri.toString()}`)

    const key = file.uri.toString()

    this.files.set(key, file)
    this.referenceCounter.setValue(key, this.referenceCounter.getValue(key) + 1)

    return [file, undefined]
  }

  update(uri: string): [File?, Error?] {
    const file = this.files.get(uri)
    if (!file) {
      return [file, new Error(`file changed but not exists in fileStore. uri: ${uri}`)]
    }

    file.update()
    this.log.silly(`file updated: ${file.uri.toString()}`)

    return [file, undefined]
  }

  delete(uri: string): Error | undefined {
    if (!this.files.delete(uri)) {
      return new Error(`trying to delete file but not exists in fileStore. uri: ${uri}`)
    }

    this.referenceCounter.setValue(uri, this.referenceCounter.getValue(uri) - 1)
    const remaining = this.referenceCounter.getValue(uri)

    if (remaining && remaining <= 0) {
      this.referenceCounter.remove(uri)
    }
  }
}
