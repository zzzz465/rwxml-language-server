import EventEmitter from 'events'
import { either } from 'fp-ts'
import * as path from 'path'
import { inject, Lifecycle, scoped } from 'tsyringe'
import TypedEventEmitter from 'typed-emitter'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import { FileStore } from './fileStore'
import {
  AudioFile,
  DLLFile,
  File,
  isDLLFile,
  isImageFile as isTextureFile,
  isSoundFile as isAudioFile,
  isXMLFile,
  TextureFile,
  XMLFile,
} from './fs'
import defaultLogger, { withClass, withVersion } from './log'
import { LoadFolder } from './mod/loadfolders'
import { ModDependencyBags } from './mod/modDependencyBags'
import { ProjectWorkspace } from './mod/projectWorkspace'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'
import { TextDocumentManager } from './textDocumentManager'
import { Counter } from './utils/counter'

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
  private log = winston.createLogger({
    format: winston.format.combine(withClass(ResourceStore), withVersion(this.version)),
    transports: [defaultLogger()],
  })

  readonly files: Set<string> = new Set()
  readonly xmls: Map<string, string> = new Map()
  readonly dllFiles: Set<string> = new Set()
  readonly textures: Set<string> = new Set()
  readonly audios: Set<string> = new Set()
  readonly audioDirectories = new Counter<string>()

  readonly event = new EventEmitter() as TypedEventEmitter<Events>

  private projectWorkspace: ProjectWorkspace

  constructor(
    @inject(RimWorldVersionToken) private readonly version: RimWorldVersion,
    private readonly loadFolder: LoadFolder,
    private readonly fileStore: FileStore,
    private readonly modDependencyBags: ModDependencyBags,
    private readonly textDocumentManager: TextDocumentManager
  ) {
    let workspace = loadFolder.getProjectWorkspace(this.version)
    if (!workspace) {
      this.log.warn('projectWorkspace not found.')
      workspace = new ProjectWorkspace(this.version, URI.parse(''), [])
    }

    this.projectWorkspace = workspace

    modDependencyBags.event.on('dependencyChanged', () => this.onDependencyChanged())
    loadFolder.event.on('loadFolderChanged', (loadFolder) => this.onLoadFolderChanged(loadFolder))
    textDocumentManager.event.on('textDocumentChanged', (doc) => this.onTextDocumentChanged(doc))
  }

  /**
   * isProjectResource determines given arg is a part of this project.
   * @param fileOrUri file or uri to test.
   * @returns whether the file is a part of this project.
   */
  isProjectResource(fileOrUri: File | string): boolean {
    const uri = fileOrUri instanceof File ? fileOrUri.uri.toString() : fileOrUri

    // is the file already registered as project resource?
    // NOTE: Why this is required?
    // if (this.files.has(uri)) {
    //   return true
    // }

    // is the file registered as dependency?
    if (this.isDependencyFile(uri)) {
      return true
    }

    // is the file comes from current workspace?
    if (this.projectWorkspace.includes(URI.parse(uri))) {
      return true
    }

    return false
  }

  isDependencyFile(uri: string): boolean {
    return this.modDependencyBags.isDependencyFile(this.version, uri)
  }

  private onTextDocumentChanged(doc: TextDocument): void {
    const uri = doc.uri

    if (!this.isProjectResource(uri)) {
      return
    }

    if (!isXMLFile(path.extname(uri))) {
      return
    }

    const data = doc.getText()

    this.xmls.set(uri, data)

    this.event.emit('xmlChanged', uri)
  }

  fileAdded(file: File): void {
    if (!this.isProjectResource(file)) {
      return
    }

    const uri = file.uri.toString()

    if (this.files.has(uri)) {
      this.log.error(`file already exists. uri: ${uri}`)
      return
    }

    this.files.add(uri)

    if (isXMLFile(file.ext)) {
      this.onXMLFileAdded(file as XMLFile)
    } else if (isTextureFile(file.ext)) {
      this.onTextureFileAdded(file as TextureFile)
    } else if (isAudioFile(file.ext)) {
      this.onAudioFileAdded(file as AudioFile)
    } else if (isDLLFile(file.ext)) {
      this.onDLLFileAdded(file as DLLFile)
    }

    this.log.silly(`resource added. uri: ${file.uri.toString()}`)
  }

  fileChanged(uri: string): void {
    if (!this.isProjectResource(uri)) {
      return
    }

    if (!this.files.has(uri)) {
      this.log.error(`file is project resource but not registered. uri: ${uri}`)
      return
    }

    const file = this.fileStore.get(uri)
    if (!file) {
      this.log.error(`file registered as project resource but not exists. uri: ${uri}`)
      return
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

  fileDeleted(uri: string): void {
    const ext = path.extname(uri)

    if (isXMLFile(ext)) {
      this.onXMLFileDeleted(uri)
    } else if (isTextureFile(ext)) {
      this.onTextureFileDeleted(uri)
    } else if (isAudioFile(ext)) {
      this.onAudioFileDeleted(uri)
    } else if (isDLLFile(ext)) {
      this.onDLLFileDeleted(uri)
    }

    this.event.emit('xmlDeleted', uri)

    if (!this.files.delete(uri)) {
      this.log.error(`trying to delete file but not exists. uri: ${uri}`)
    }

    this.log.silly(`resource deleted. uri: ${uri.toString()}`)
  }

  /**
   * compare project files against fileStore, and add/delete files
   */
  reload(reason?: string): void {
    this.log.debug(`reload resourceStore. reason: ${reason}`)
    for (const [uri, file] of this.fileStore) {
      if (this.isProjectResource(uri) && !this.files.has(uri)) {
        this.fileAdded(file)
      }
    }

    for (const uri of [...this.files.values()]) {
      if (!this.isProjectResource(uri)) {
        this.fileDeleted(uri)
      }
    }
  }

  private async onXMLFileAdded(file: XMLFile): Promise<void> {
    await this.onXMLFileChanged(file)
  }

  private async onXMLFileChanged(file: XMLFile): Promise<void> {
    const uri = file.uri.toString()
    const res = await this.textDocumentManager.getText(uri)
    if (either.isLeft(res)) {
      this.log.error(`failed retrieving textDocument. err: ${res.left}`)
      return
    }

    this.xmls.set(uri, res.right)

    this.event.emit('xmlChanged', uri)
  }

  private onXMLFileDeleted(uri: string): void {
    if (!this.xmls.delete(uri)) {
      this.log.error(`trying to delete xml ${uri} but not exists.`)
    }
  }

  private onTextureFileAdded(file: TextureFile): void {
    const workspace = this.loadFolder.getProjectWorkspace(this.version)
    if (!workspace) {
      this.log.error(`cannot find workspace of version "${this.version}"`)
      return
    }

    const resourcePath = workspace.getResourcePath(file.uri) // .getResourcePath(file.uri, this.version)
    if (!resourcePath) {
      // 1. the image is from dependency file
      // 2. the image is not under Textures/
      return
    }

    this.textures.add(resourcePath)
  }

  private onTextureFileChanged(file: TextureFile): void {
    // just do nothing.
    // const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(file.uri) // .getResourcePath(file.uri, this.version)
    // if (!resourcePath) {
    //   this.log.error(`texture updated but not exists. uri: ${file.uri.toString()}`)
    // }
  }

  private onTextureFileDeleted(uri: string): void {
    const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(URI.parse(uri))
    if (!resourcePath) {
      this.log.error(`texture deleted but not exists. uri: ${uri}`)
      return
    }

    this.textures.delete(resourcePath)
  }

  private onAudioFileAdded(file: AudioFile): void {
    const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(file.uri) // .getResourcePath(file.uri, this.version)
    if (!resourcePath) {
      this.log.error(`audio registered but not exists. uri: ${file.uri.toString()}`)
      return
    }

    const resourceDir = path.dirname(resourcePath)
    this.audios.add(resourcePath)
    this.audioDirectories.add(resourceDir)
  }

  private onAudioFileChanged(file: AudioFile): void {
    // do nothing.
    // const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.includes(file.uri) // .getResourcePath(file.uri, this.version)
    // if (!resourcePath) {
    //   this.log.error(`audio registered but not exists. uri: ${file.uri.toString()}`)
    // }
  }

  private onAudioFileDeleted(uri: string): void {
    const resourcePath = this.loadFolder.getProjectWorkspace(this.version)?.getResourcePath(URI.parse(uri))
    if (!resourcePath) {
      this.log.error(`audio registered but not exists. uri: ${uri}`)
      return
    }

    const resourceDir = path.dirname(resourcePath)
    this.audios.delete(resourcePath)
    this.audioDirectories.remove(resourceDir)
  }

  private onDLLFileAdded(file: DLLFile): void {
    const uri = file.uri.toString()
    if (this.dllFiles.has(uri)) {
      this.log.error(`dll added but already exists. uri: ${uri}`)
      return
    }

    this.dllFiles.add(uri)

    this.event.emit('dllChanged', uri)
  }

  private onDLLFileChanged(file: DLLFile): void {
    const uri = file.uri.toString()
    if (!this.dllFiles.has(uri)) {
      this.log.error(`dll changed but not exists. uri: ${file.uri.toString()}`)
      return
    }

    this.event.emit('dllChanged', uri)
  }

  private onDLLFileDeleted(uri: string): void {
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

    this.reload('loadFolderChanged')
  }

  private onDependencyChanged(): void {
    this.reload('dependencyChanged')
  }
}
