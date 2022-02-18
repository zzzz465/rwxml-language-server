import EventEmitter from 'events'
import { container, DependencyContainer, singleton } from 'tsyringe'
import { URI } from 'vscode-uri'
import { DependencyFile, File } from './fs'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEvents } from './notificationEventManager'
import { Project } from './project'
import { ResourceStore } from './resourceStore'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'
import * as winston from 'winston'
import { About } from './mod'

// event that Projects will emit.
interface ProjectManagerEvent {
  fileAdded(version: string, file: File): void
  fileChanged(version: string, file: File): void
  fileDeleted(version: string, file: File): void
}

/**
 * ProjectManager manages DI container of specific rimworld version
 * and dispatch various events to each container
 */
@singleton()
export class ProjectManager {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${ProjectManager.name}] ${info.message}`)
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  private readonly projectContainers: Map<string, DependencyContainer> = new Map()

  constructor(private readonly about: About, private readonly loadFolder: LoadFolder) {
    about.event.on('supportedVersionsChanged', this.onSupportedVersionsChanged.bind(this))
  }

  listen(notiEvent: EventEmitter<NotificationEvents>): void {
    notiEvent.on('fileAdded', this.onProjectFileAdded.bind(this))
    notiEvent.on('fileChanged', this.onProjectFileChanged.bind(this))
    notiEvent.on('fileDeleted', this.onProjectFileDeleted.bind(this))
  }

  setSupportedVersions(versions: string[]): void {
    const added: string[] = versions.filter((ver) => !this.projectContainers.has(ver))
    const deleted: string[] = [...this.projectContainers.keys()].filter((ver) => !versions.includes(ver))

    for (const ver of deleted) {
      const c = this.projectContainers.get(ver)
      c?.clearInstances()

      this.projectContainers.delete(ver)
    }

    for (const ver of added) {
      this.getOrCreateContainer(ver)
    }

    this.log.info(`supportedVersions added: ${JSON.stringify(added, null, 2)}`)
    this.log.info(`supportedVersions deleted: ${JSON.stringify(deleted, null, 2)}`)
  }

  getProject(version: string): Project {
    const c = this.getOrCreateContainer(version)
    return c.resolve(Project)
  }

  private onSupportedVersionsChanged() {
    this.setSupportedVersions(this.about.supportedVersions)
  }

  private onProjectFileAdded(file: File) {
    this.log.debug(`file added: ${file.uri}`)

    const versions = this.loadFolder.isBelongsTo(file.uri)
    this.log.debug(`file's version is determined to: ${versions}`)

    for (const version of versions) {
      this.log.debug(`version: ${version}`)
      const c = this.getOrCreateContainer(version)
      c.resolve(ResourceStore).fileAdded(file)
    }
  }

  private onProjectFileChanged(file: File) {
    this.log.debug(`file changed: ${file.uri}`)

    const versions = this.loadFolder.isBelongsTo(file.uri)
    this.log.debug(`file's version is determined to: ${versions}`)

    for (const version of versions) {
      this.log.debug(`version: ${version}`)
      const c = this.getOrCreateContainer(version)
      c.resolve(ResourceStore).fileChanged(file)
    }
  }

  private onProjectFileDeleted(uri: string) {
    this.log.debug(`file deleted: ${uri}`)

    const versions = this.loadFolder.isBelongsTo(URI.parse(uri))
    this.log.debug(`file's version is determined to: ${versions}`)

    for (const version of versions) {
      this.log.debug(`version: ${version}`)
      const c = this.getOrCreateContainer(version)
      c.resolve(ResourceStore).fileDeleted(uri)
    }
  }

  private onContentChanged(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      const c = this.getOrCreateContainer(version)
      c.resolve(ResourceStore).fileChanged(file)
    }
  }

  private getOrCreateContainer(version: string): DependencyContainer {
    let projectContainer = this.projectContainers.get(version)
    if (!projectContainer) {
      projectContainer = this.newContainer(version)
      this.projectContainers.set(version, projectContainer)
    }

    return projectContainer
  }

  private newContainer(version: string): DependencyContainer {
    const childContainer = container.createChildContainer()
    childContainer.register(RimWorldVersionToken, { useValue: version })

    return childContainer
  }
}

// checks event is acceptable, ignore if not.
type ExcludeFirstParameter<F> = F extends (version: RimWorldVersion, ...args: infer P) => infer R
  ? (...args: P) => R
  : never

type EventVersionFilterEvent = {
  [event in keyof ProjectManagerEvent]: ExcludeFirstParameter<ProjectManagerEvent[event]>
}

/**
 * @deprecated don't filter events, just pass it directly
 */
class EventVersionFilter {
  public readonly event: EventEmitter<EventVersionFilterEvent> = new EventEmitter()
  constructor(private readonly version: RimWorldVersion, private readonly loadFolders: LoadFolder) {}

  listen(event: EventEmitter<ProjectManagerEvent>) {
    event.on('fileAdded', this.onFileAdded.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    event.on('fileDeleted', this.onFileDeleted.bind(this))
  }

  private onFileAdded(version: RimWorldVersion, file: File) {
    if (this.ignoreFilter(file) || this.loadFolders.isBelongsTo(file.uri).includes(this.version)) {
      this.event.emit('fileAdded', file)
    }
  }

  private onFileChanged(version: RimWorldVersion, file: File) {
    if (this.ignoreFilter(file) || this.loadFolders.isBelongsTo(file.uri).includes(this.version)) {
      this.event.emit('fileChanged', file)
    }
  }

  private onFileDeleted(version: RimWorldVersion, file: File) {
    if (this.ignoreFilter(file) || this.loadFolders.isBelongsTo(file.uri).includes(this.version)) {
      this.event.emit('fileDeleted', file)
    }
  }

  private ignoreFilter(file: File) {
    if (DependencyFile.is(file)) {
      if (file.ownerPackageId.startsWith('Ludeon.RimWorld')) {
        // core, royalty, ideology is loaded from local directory
        // and it always have version "default"
        return true
      }
    }

    return false
  }
}
