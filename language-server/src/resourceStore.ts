import { TextureFile, AudioFile, File, DependencyFile, DLLFile, XMLFile } from './fs'
import { LoadFolder } from './mod/loadfolders'
import { Counter } from './utils/counter'
import path from 'path'
import { inject, Lifecycle, scoped } from 'tsyringe'
import EventEmitter from 'events'
import assert from 'assert'
import * as winston from 'winston'
import { URI } from 'vscode-uri'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'
import { FileStore } from './fileStore'
import { LogToken } from './log'
import { ProjectWorkspace } from './mod/projectWorkspace'
import TypedEventEmitter from 'typed-emitter'
import { ModDependencyBags } from './mod/modDependencyBags'

type Events = {
  workspaceChanged(): void
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
  private readonly log: winston.Logger

  readonly files: Map<string, File> = new Map()

  readonly xmls: Map<string, string> = new Map()
  readonly dllFiles: Set<string> = new Set()
  readonly textures: Set<string> = new Set()
  readonly audios: Set<string> = new Set()
  readonly audioDirectories = new Counter<string>()

  readonly event = new EventEmitter() as TypedEventEmitter<Events>

  private projectWorkspace = new ProjectWorkspace(this.version, URI.parse(''), [])

  constructor(
    @inject(RimWorldVersionToken) private readonly version: RimWorldVersion,
    private readonly loadFolder: LoadFolder,
    private readonly fileStore: FileStore,
    private readonly modDependencyBags: ModDependencyBags,
    @inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })

    loadFolder.event.on('loadFolderChanged', (loadFolder) => this.onLoadFolderChanged(loadFolder))
  }

  listen(events: EventEmitter) {
    events.on('fileAdded', this.fileAdded.bind(this))
    events.on('fileChanged', this.fileChanged.bind(this))
    events.on('fileDeleted', this.fileDeleted.bind(this))
  }

  isDependencyFile(uri: string): boolean {
    return this.modDependencyBags.isDependencyFile(this.version, uri)
  }

  fileAdded(file: File) {
    if (!this.isProjectResource(file)) {
      return
    }

    this.log.silly(`file added: ${file.uri.toString()}`)

    this.files.set(file.uri.toString(), file)

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
    if (!this.isProjectResource(file)) {
      return
    }

    this.log.silly(`file changed: ${file}`)

    this.files.set(file.uri.toString(), file)

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
    if (!this.isProjectResource(uri)) {
      return
    }

    this.log.silly(`file deleted: ${uri}`)

    assert(typeof uri === 'string', 'fileDeleted must accept string type')

    const file = this.files.get(uri)
    if (!file) {
      throw new Error(`file ${uri} doesn't exists on file map.`)
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

    this.event.emit('xmlDeleted', uri)
  }

  /**
   * compare project files against fileStore, and add/delete files
   * NOTE: this might cause performance issue.
   */
  reload() {
    for (const [uri, file] of this.fileStore) {
      if (this.isProjectResource(uri)) {
        if (!this.files.has(uri)) {
          // when file is not registered but it should
          this.log.silly(`(reloading) add non-registred project resource: ${uri}`)
          this.fileAdded(file)
        }
      } else {
        if (this.files.has(uri)) {
          // when file is registered but should be removed
          this.log.silly(`(reloading) deleting registered project resource: ${uri}`)
          this.fileDeleted(uri)
        }
      }
    }
  }

  private async onXMLFileChanged(file: XMLFile) {
    this.log.silly(`xml file changed: ${file}`)

    const uri = file.uri.toString()
    const data = await file.read()
    this.xmls.set(uri, data)

    this.event.emit('xmlChanged', uri)
  }

  private onXMLFileDeleted(uri: string) {
    this.log.silly(`xml file deleted: ${uri}`)

    if (!this.xmls.delete(uri)) {
      this.log.warn(`trying to delete xml ${uri} but not exists.`)
    }
  }

  private onTextureFileChanged(file: TextureFile) {
    const resourcePath = this.loadFolder.getResourcePath(file.uri, this.version)
    if (resourcePath) {
      this.log.silly(`texture added, version: ${this.version}, uri: ${file.toString()}`)
      this.textures.add(resourcePath)
    }
  }

  private onTextureFileDeleted(uri: string) {
    const resourcePath = this.loadFolder.getResourcePath(URI.parse(uri), this.version)
    if (resourcePath) {
      this.log.silly(`texture deleted, version: ${this.version}, uri: ${uri}`)
      this.textures.delete(resourcePath)
    }
  }

  private onAudioFileChanged(file: AudioFile) {
    const resourcePath = this.loadFolder.getResourcePath(file.uri, this.version)
    if (resourcePath) {
      const resourceDir = path.dirname(resourcePath)

      this.log.silly(`audio changed, version: ${this.version}, uri: ${file.toString()}`)
      this.audios.add(resourcePath)
      this.audioDirectories.add(resourceDir)
    }
  }

  private onAudioFileDeleted(uri: string) {
    const resourcePath = this.loadFolder.getResourcePath(URI.parse(uri), this.version)
    if (resourcePath) {
      const resourceDir = path.dirname(resourcePath)

      this.log.silly(`audio deleted, version: ${this.version}, uri: ${uri}`)
      this.audios.delete(resourcePath)
      this.audioDirectories.remove(resourceDir)
    }
  }

  private onDLLFileChanged(file: DLLFile) {
    this.log.silly(`DLLFile changed: ${file.uri.toString()}`)

    // NOTE: should I pass File or uri string?
    this.dllFiles.add(file.uri.toString())
    this.event.emit('dllChanged', file.uri.toString())
  }

  private onDLLFileDeleted(uri: string) {
    this.log.silly(`DLLFile deleted: ${uri}`)

    if (!this.dllFiles.has(uri)) {
      this.log.warn(`trying to delete dllFile, but ${uri} is not exists.`)
    } else {
      this.dllFiles.delete(uri)
    }

    this.event.emit('dllDeleted', uri)
  }

  /**
   * isProjectResource determines given arg is a part of this project.
   * @param fileOrUri file or uri to test.
   * @returns whether the file is a part of this project.
   */
  isProjectResource(fileOrUri: File | string): boolean {
    const uri = fileOrUri instanceof File ? fileOrUri.uri.toString() : fileOrUri
    const file = this.fileStore.get(uri)

    // 0. is the file registered in fileStore?
    if (!file) {
      return false
    }

    // 1. is the file already registered as project resource?
    if (this.files.get(uri)) {
      return true
    }

    // 2. is the file allowed according to loadFolder.xml?
    if (this.loadFolder.getProjectWorkspace(this.version)?.includes(URI.parse(uri))) {
      return true
    }

    // const [required, optional] = this.modDependencyManager.getDependenciesOf(this.version)
    if (DependencyFile.is(file) && file.ownerPackageId === 'Ludeon.RimWorld') {
      // 3. is the file from core?
      return true
    }

    // 4. is the file registered as dependency?
    if (this.isDependencyFile(uri)) {
      return true
    }

    return false
  }

  private onLoadFolderChanged(loadFolder: LoadFolder): void {
    const newProjectWorkspace = loadFolder.getProjectWorkspace(this.version)
    if (!newProjectWorkspace) {
      this.log.error('loadfolder returns null projectWorkspace.')
      return
    }

    if (!newProjectWorkspace.isEqual(this.projectWorkspace)) {
      this.event.emit('workspaceChanged')
    }

    this.projectWorkspace = newProjectWorkspace
  }
}
