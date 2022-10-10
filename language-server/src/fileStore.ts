import EventEmitter from 'events'
import { either } from 'fp-ts'
import ono, { ErrorLike } from 'ono'
import { singleton } from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { DefaultDictionary } from 'typescript-collections'
import * as winston from 'winston'
import { File, FileCreateParameters } from './fs'
import defaultLogger, { withClass } from './log'
import { NotificationEvents } from './notificationEventManager'
import { Result } from './utils/functional/result'

type Events = NotificationEvents

@singleton()
export class FileStore {
  private log = winston.createLogger({
    format: winston.format.combine(withClass(FileStore)),
    transports: [defaultLogger()],
  })

  public readonly event = new EventEmitter() as TypedEventEmitter<Events>

  private readonly files: Map<string, File> = new Map()
  private readonly referenceCounter: DefaultDictionary<string, number> = new DefaultDictionary(() => 0)

  get(uri: string): File | null {
    return this.files.get(uri) ?? null
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

  load(params: FileCreateParameters): Result<File, ErrorLike> {
    const uri = params.uri.toString()

    if (this.files.has(uri)) {
      const file = this.files.get(uri)
      if (!file) {
        return either.left(ono('(panic) file not exists.'))
      }

      const ref = this.incrRef(uri)

      this.log.silly(`file loaded. refCount: ${ref}, uri: ${uri}`)

      return either.right(file)
    }

    const file = File.create(params)

    this.files.set(uri, file)
    const ref = this.incrRef(uri)
    if (ref === 1) {
      this.event.emit('fileAdded', file)
    }

    this.log.silly(`file loaded. refCount: ${ref}, uri: ${uri}`)

    return either.right(file)
  }

  update(uri: string): Result<File, Error> {
    const file = this.files.get(uri)
    if (!file) {
      return either.left(ono(`file changed but not exists in fileStore. uri: ${uri}`))
    }

    file.update()

    this.event.emit('fileChanged', file)

    return either.right(file)
  }

  unload(uri: string): Error | null {
    const ref = this.decrRef(uri)

    if (ref === 0) {
      if (!this.files.delete(uri)) {
        return ono(`trying to delete file that is not exists. uri: ${uri}`)
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
