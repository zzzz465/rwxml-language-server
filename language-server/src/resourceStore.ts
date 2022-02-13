import { TextureFile, AudioFile, File, DependencyFile, DLLFile, XMLFile } from './fs'
import { LoadFolder } from './mod/loadfolders'
import { Counter } from './utils/counter'
import path from 'path'
import { DefaultDictionary } from 'typescript-collections'
import { inject, Lifecycle, scoped } from 'tsyringe'
import EventEmitter from 'events'
import assert from 'assert'
import * as winston from 'winston'
import { URI } from 'vscode-uri'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'

interface Events {
  dllChanged(uri: string): void
  dllDeleted(uri: string): void
  xmlChanged(uri: string): void
  xmlDeleted(uri: string): void
}

/**
 * ResourceStore stores all resource of the project
 * it always displays latest state of the project files
 */
@scoped(Lifecycle.ContainerScoped)
export class ResourceStore {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${ResourceStore.name}] [${this.version}] ${info.message}`
  )
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  readonly files: Map<string, File> = new Map()
  readonly depFiles: DefaultDictionary<string, Map<string, DependencyFile>> = new DefaultDictionary(() => new Map())

  readonly xmls: Map<string, string> = new Map()
  readonly dllFiles: Set<string> = new Set()
  readonly textures: Set<string> = new Set()
  readonly audios: Set<string> = new Set()
  readonly audioDirectories = new Counter<string>()

  readonly event: EventEmitter<Events> = new EventEmitter()

  constructor(
    @inject(RimWorldVersionToken) private readonly version: RimWorldVersion,
    private readonly loadFolder: LoadFolder
  ) {}

  listen(events: EventEmitter) {
    events.on('fileAdded', this.fileAdded.bind(this))
    events.on('fileChanged', this.fileChanged.bind(this))
    events.on('fileDeleted', this.fileDeleted.bind(this))
  }

  isDependencyFile(uri: string): boolean | null {
    const file = this.files.get(uri)
    if (!file) {
      return null
    }

    if (DependencyFile.is(file)) {
      return this.depFiles.getValue(file.ownerPackageId).has(uri)
    }

    return false
  }

  fileAdded(file: File) {
    this.log.debug(`file added: ${file}`)

    this.files.set(file.uri.toString(), file)

    if (DependencyFile.is(file)) {
      this.depFiles.getValue(file.ownerPackageId).set(file.uri.toString(), file)
    }

    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    } else if (file instanceof TextureFile) {
      this.onTextureFileChanged(file)
    } else if (file instanceof AudioFile) {
      this.onAudioFileChanged(file)
    } else if (file instanceof DLLFile) {
      this.onDLLFileChanged(file)
    }
  }

  fileChanged(file: File) {
    this.log.debug(`file changed: ${file}`)

    this.files.set(file.uri.toString(), file)

    if (DependencyFile.is(file)) {
      this.depFiles.getValue(file.ownerPackageId).set(file.uri.toString(), file)
    }
    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    } else if (file instanceof TextureFile) {
      this.onTextureFileChanged(file)
    } else if (file instanceof AudioFile) {
      this.onAudioFileChanged(file)
    } else if (file instanceof DLLFile) {
      this.onDLLFileChanged(file)
    }
  }

  fileDeleted(uri: string) {
    this.log.debug(`file deleted: ${uri}`)

    assert(typeof uri === 'string', 'fileDeleted must accept string type')

    const file = this.files.get(uri)
    if (!file) {
      throw new Error(`file ${uri} doesn't exists on file map.`)
    }

    if (DependencyFile.is(file)) {
      this.depFiles.getValue(file.ownerPackageId).delete(file.uri.toString())
    }

    if (file instanceof XMLFile) {
      this.onXMLFileDeleted(uri)
    } else if (file instanceof TextureFile) {
      this.onTextureFileDeleted(uri)
    } else if (file instanceof AudioFile) {
      this.onAudioFileDeleted(uri)
    } else if (file instanceof DLLFile) {
      this.onDLLFileDeleted(uri)
    }

    if (!this.files.delete(uri)) {
      this.log.warn(`trying to delete file ${uri} but not exists.`)
    }
  }

  private async onXMLFileChanged(file: XMLFile) {
    this.log.debug(`xml file changed: ${file}`)

    const uri = file.uri.toString()
    const data = await file.read()
    this.xmls.set(uri, data)

    this.event.emit('xmlChanged', uri)
  }

  private onXMLFileDeleted(uri: string) {
    this.log.debug(`xml file deleted: ${uri}`)

    if (!this.xmls.delete(uri)) {
      this.log.warn(`trying to delete xml ${uri} but not exists.`)
    }
  }

  private onTextureFileChanged(file: TextureFile) {
    const resourcePath = this.loadFolder.getResourcePath(file.uri, this.version)
    if (resourcePath) {
      log.debug(`texture added, version: ${this.version}, uri: ${file.toString()}`)
      this.textures.add(resourcePath)
    }
  }

  private onTextureFileDeleted(uri: string) {
    const resourcePath = this.loadFolder.getResourcePath(URI.parse(uri), this.version)
    if (resourcePath) {
      log.debug(`texture deleted, version: ${this.version}, uri: ${uri}`)
      this.textures.delete(resourcePath)
    }
  }

  private onAudioFileChanged(file: AudioFile) {
    const resourcePath = this.loadFolder.getResourcePath(file.uri, this.version)
    if (resourcePath) {
      const resourceDir = path.dirname(resourcePath)

      log.debug(`audio changed, version: ${this.version}, uri: ${file.toString()}`)
      this.audios.add(resourcePath)
      this.audioDirectories.add(resourceDir)
    }
  }

  private onAudioFileDeleted(uri: string) {
    const resourcePath = this.loadFolder.getResourcePath(URI.parse(uri), this.version)
    if (resourcePath) {
      const resourceDir = path.dirname(resourcePath)

      log.debug(`audio deleted, version: ${this.version}, uri: ${uri}`)
      this.audios.delete(resourcePath)
      this.audioDirectories.remove(resourceDir)
    }
  }

  private onDLLFileChanged(file: DLLFile) {
    // NOTE: should I pass File or uri string?
    this.dllFiles.add(file.uri.toString())
    this.event.emit('dllChanged', file.uri.toString())
  }

  private onDLLFileDeleted(uri: string) {
    if (!this.dllFiles.has(uri)) {
      this.log.warn(`trying to delete dllFile, but ${uri} is not exists.`)
    } else {
      this.dllFiles.delete(uri)
    }

    this.event.emit('dllDeleted', uri)
  }
}
