import EventEmitter from 'events'
import { inject, singleton } from 'tsyringe'
import { File, FileCreateParameters } from './fs'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'
import { LogToken } from './log'
import TypedEventEmitter from 'typed-emitter'
import { DefaultDictionary } from 'typescript-collections'
import { Result } from './types/functional'
import * as ono from 'ono'

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

  load(params: FileCreateParameters): Result<File, ono.ErrorLike> {
    const uri = params.uri.toString()

    if (this.files.has(uri)) {
      const file = this.files.get(uri)
      if (!file) {
        return [null, ono.ono('(panic) file not exists.')]
      }

      this.incrRef(uri)
      return [file, null]
    }

    const file = File.create(params)

    this.files.set(uri, file)
    this.incrRef(uri)

    return [file, null]
  }

  update(uri: string): Result<File, Error> {
    const file = this.files.get(uri)
    if (!file) {
      return [null, new Error(`file changed but not exists in fileStore. uri: ${uri}`)]
    }

    file.update()

    return [file, null]
  }

  delete(uri: string): Error | null {
    if (!this.files.delete(uri)) {
      return new Error(`trying to delete file but not exists in fileStore. uri: ${uri}`)
    }

    this.decrRef(uri)

    return null
  }

  private incrRef(uri: string): void {
    this.referenceCounter.setValue(uri, this.referenceCounter.getValue(uri) + 1)
  }

  private decrRef(uri: string): void {
    const before = this.referenceCounter.setValue(uri, this.referenceCounter.getValue(uri) - 1)
    if (before === 1) {
      this.referenceCounter.remove(uri)
    }
  }
}
