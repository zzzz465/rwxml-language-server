import { TextureFile, AudioFile, File, DLLFile, XMLFile } from './fs'
import { LoadFolder } from './mod/loadfolders'
import { Counter } from './utils/counter'
import path from 'path'
import { inject, Lifecycle, scoped } from 'tsyringe'
import EventEmitter from 'events'
import * as winston from 'winston'
import { URI } from 'vscode-uri'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'
import { FileStore } from './fileStore'
import { LogToken } from './log'
import { ProjectWorkspace } from './mod/projectWorkspace'
import TypedEventEmitter from 'typed-emitter'
import { ModDependencyBags } from './mod/modDependencyBags'
import * as ono from 'ono'

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

  readonly files: Set<string> = new Set()
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

    modDependencyBags.event.on('dependencyChanged', () => this.onDependencyChanged())
    loadFolder.event.on('loadFolderChanged', (loadFolder) => this.onLoadFolderChanged(loadFolder))
  }

  listen(events: EventEmitter) {
    events.on('fileAdded', this.fileAdded.bind(this))
    events.on('fileChanged', this.fileChanged.bind(this))
    events.on('fileDeleted', this.fileDeleted.bind(this))
  }

  /**
   * isProjectResource determines given arg is a part of this project.
   * @param fileOrUri file or uri to test.
   * @returns whether the file is a part of this project.
   */
  isProjectResource(fileOrUri: File | string): boolean {
    const uri = fileOrUri instanceof File ? fileOrUri.uri.toString() : fileOrUri
    const file = this.fileStore.get(uri)

    // 1. is the file registered in fileStore?
    if (!file) {
      return false
    }

    // 2. is the file already registered as project resource?
    // if (this.files.has(uri)) {
    // return true
    // }

    // 3. is the file registered as dependency?
    if (this.isDependencyFile(uri)) {
      return true
    }

    // 4. is the file comes from current workspace?
    if (this.projectWorkspace.includes(URI.parse(uri))) {
      return true
    }

    return false
  }

  isDependencyFile(uri: string): boolean {
    return this.modDependencyBags.isDependencyFile(this.version, uri)
  }

  fileAdded(file: File): ono.ErrorLike | null {
    if (!this.isProjectResource(file)) {
      return null
    }

    const uri = file.uri.toString()

    if (this.files.has(uri)) {
      return ono.ono(`file already exists. uri: ${uri}`)
    }

    this.files.add(uri)

    if (file instanceof XMLFile) {
      this.onXMLFileAdded(file)
    } else if (file instanceof TextureFile) {
      this.onTextureFileAdded(file)
    } else if (file instanceof AudioFile) {
      this.onAudioFileAdded(file)
    } else if (file instanceof DLLFile) {
      this.onDLLFileAdded(file)
    }

    return null
  }

  fileChanged(uri: string): ono.ErrorLike | null {
    if (!this.isProjectResource(uri)) {
      return null
    }

    if (!this.files.has(uri)) {
      return ono.ono(`file is project resource but not registered. uri: ${uri}`)
    }

    const file = this.fileStore.get(uri)
    if (!file) {
      return ono.ono(`file registered as project resource but not exists. uri: ${uri}`)
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

    return null
  }

  fileDeleted(uri: string): ono.ErrorLike | null {
    if (!this.isProjectResource(uri)) {
      return null
    }

    const file = this.fileStore.get(uri)
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

    return null
  }

  /**
   * compare project files against fileStore, and add/delete files
   */
  fetchFiles() {
    for (const [uri, file] of this.fileStore) {
      if (this.isProjectResource(uri) && !this.files.has(uri)) {
        this.fileAdded(file)
      }
    }

    for (const [uri] of [...this.files]) {
      if (!this.isProjectResource(uri)) {
        this.fileDeleted(uri)
      }
    }
  }

  private async onXMLFileAdded(file: XMLFile) {
    await this.onXMLFileChanged(file)
  }

  private async onXMLFileChanged(file: XMLFile) {
    const uri = file.uri.toString()
    const data = await file.read()
    this.xmls.set(uri, data)

    this.event.emit('xmlChanged', uri)
  }

  private onXMLFileDeleted(uri: string) {
    if (!this.xmls.delete(uri)) {
      this.log.error(`trying to delete xml ${uri} but not exists.`)
    }
  }

  private onTextureFileAdded(file: TextureFile) {
    const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(file.uri) // .getResourcePath(file.uri, this.version)
    if (!resourcePath) {
      this.log.error(`texture added but cannot find resourcePath. uri: ${file.uri.toString()}`)
      return
    }

    this.textures.add(resourcePath)
  }

  private onTextureFileChanged(file: TextureFile) {
    // just do nothing.
    // const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(file.uri) // .getResourcePath(file.uri, this.version)
    // if (!resourcePath) {
    //   this.log.error(`texture updated but not exists. uri: ${file.uri.toString()}`)
    // }
  }

  private onTextureFileDeleted(uri: string) {
    const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(URI.parse(uri))
    if (!resourcePath) {
      this.log.error(`texture deleted but not exists. uri: ${uri}`)
      return
    }

    this.textures.delete(resourcePath)
  }

  private onAudioFileAdded(file: AudioFile) {
    const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(file.uri) // .getResourcePath(file.uri, this.version)
    if (!resourcePath) {
      this.log.error(`audio registered but not exists. uri: ${file.uri.toString()}`)
      return
    }

    const resourceDir = path.dirname(resourcePath)
    this.audios.add(resourcePath)
    this.audioDirectories.add(resourceDir)
  }

  private onAudioFileChanged(file: AudioFile) {
    // do nothing.
    // const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.includes(file.uri) // .getResourcePath(file.uri, this.version)
    // if (!resourcePath) {
    //   this.log.error(`audio registered but not exists. uri: ${file.uri.toString()}`)
    // }
  }

  private onAudioFileDeleted(uri: string) {
    const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(URI.parse(uri))
    if (!resourcePath) {
      this.log.error(`audio registered but not exists. uri: ${uri}`)
      return
    }

    const resourceDir = path.dirname(resourcePath)
    this.audios.delete(resourcePath)
    this.audioDirectories.remove(resourceDir)
  }

  private onDLLFileAdded(file: DLLFile) {
    const uri = file.uri.toString()
    if (this.dllFiles.has(uri)) {
      this.log.error(`dll added but already exists. uri: ${uri}`)
      return
    }

    this.event.emit('dllChanged', uri)
  }

  private onDLLFileChanged(file: DLLFile) {
    const uri = file.uri.toString()
    if (!this.dllFiles.has(uri)) {
      this.log.error(`dll changed but not exists. uri: ${file.uri.toString()}`)
      return
    }

    this.dllFiles.add(uri)

    this.event.emit('dllChanged', uri)
  }

  private onDLLFileDeleted(uri: string) {
    if (!this.dllFiles.delete(uri)) {
      this.log.error(`trying to delete dllFile, but ${uri} is not exists.`)
      return
    }

    this.event.emit('dllDeleted', uri)
  }

  private onLoadFolderChanged(loadFolder: LoadFolder): void {
    const newProjectWorkspace = loadFolder.getProjectWorkspace(this.version)
    if (!newProjectWorkspace) {
      this.log.error('loadfolder returns null projectWorkspace.')
      return
    }

    if (newProjectWorkspace.isEqual(this.projectWorkspace)) {
      return
    }

    this.projectWorkspace = newProjectWorkspace

    this.fetchFiles()
  }

  private onDependencyChanged(): void {
    this.fetchFiles()
  }
}
