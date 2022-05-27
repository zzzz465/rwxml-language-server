import EventEmitter from 'events'
import { singleton } from 'tsyringe'
import { File, FileCreateParameters } from './fs'
import { NotificationEvents } from './notificationEventManager'
import * as winston from 'winston'
import TypedEventEmitter from 'typed-emitter'
import { DefaultDictionary } from 'typescript-collections'
import { Result } from './types/functional'
import * as ono from 'ono'
import defaultLogger, { className, logFormat } from './log'

type Events = NotificationEvents

@singleton()
export class FileStore {
  private log = winston.createLogger({
    format: winston.format.combine(className(FileStore), logFormat),
    transports: [defaultLogger()],
  })

  public readonly event = new EventEmitter() as TypedEventEmitter<Events>

  private readonly files: Map<string, File> = new Map()
  private readonly referenceCounter: DefaultDictionary<string, number> = new DefaultDictionary(() => 0)

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

      const ref = this.incrRef(uri)

      this.log.silly(`file loaded. count: ${ref}, uri: ${uri}`)

      return [file, null]
    }

    const file = File.create(params)

    this.files.set(uri, file)
    const ref = this.incrRef(uri)
    if (ref === 1) {
      this.event.emit('fileAdded', file)
    }

    this.log.silly(`file loaded. count: ${ref}, uri: ${uri}`)

    return [file, null]
  }

  update(uri: string): Result<File, Error> {
    const file = this.files.get(uri)
    if (!file) {
      return [null, new Error(`file changed but not exists in fileStore. uri: ${uri}`)]
    }

    file.update()

    this.event.emit('fileChanged', file)

    return [file, null]
  }

  unload(uri: string): Error | null {
    const ref = this.decrRef(uri)

    if (ref === 0) {
      if (!this.files.delete(uri)) {
        return ono.ono(`trying to delete file that is not exists. uri: ${uri}`)
      }

      this.event.emit('fileDeleted', uri)
    }

    this.log.silly(`file unloaded. refCount: ${ref}, uri: ${uri}`)

    return null
  }

  private incrRef(uri: string): number {
    this.referenceCounter.setValue(uri, this.referenceCounter.getValue(uri) + 1)

    return this.referenceCounter.getValue(uri)
  }

  private decrRef(uri: string): number {
    const before = this.referenceCounter.setValue(uri, this.referenceCounter.getValue(uri) - 1)
    if (before === 1) {
      this.referenceCounter.remove(uri)
      return 0
    }

    return this.referenceCounter.getValue(uri)
  }
}
