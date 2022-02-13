import EventEmitter from 'events'
import { container, DependencyContainer, singleton } from 'tsyringe'
import { DependencyFile, File } from './fs'
import { LoadFolder } from './mod/loadfolders'
import { Project } from './project'
import { ResourceStore } from './resourceStore'
import { RimWorldVersion } from './RimWorldVersion'

// event that Projects will emit.
interface ProjectManagerEvent {
  fileAdded(version: string, file: File): void
  fileChanged(version: string, file: File): void
  fileDeleted(version: string, file: File): void
}

// events that ProjectManager will listen.
interface ListeningEvents {
  projectFileAdded(file: File): void
  projectFileChanged(file: File): void
  projectFileDeleted(file: File): void
  workspaceInitialized(files: File[]): void
  contentChanged(file: File): void
}

/**
 * ProjectManager manages DI container of specific rimworld version
 * and dispatch various events to each container
 */
@singleton()
export class ProjectManager {
  private readonly projectContainers: Map<string, DependencyContainer> = new Map()

  constructor(private readonly loadFolder: LoadFolder) {}

  listen(notiEvent: EventEmitter<ListeningEvents>): void {
    notiEvent.on('projectFileAdded', this.onProjectFileAdded.bind(this))
    notiEvent.on('projectFileChanged', this.onProjectFileChanged.bind(this))
    notiEvent.on('projectFileDeleted', this.onProjectFileDeleted.bind(this))
    notiEvent.on('contentChanged', this.onContentChanged.bind(this))
  }

  getProject(version: string): Project {
    const c = this.getContainer(version)
    return c.resolve(Project)
  }

  private onProjectFileAdded(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      const c = this.getContainer(version)
      c.resolve(ResourceStore).fileAdded(file)
    }
  }

  private onProjectFileChanged(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      const c = this.getContainer(version)
      c.resolve(ResourceStore).fileChanged(file)
    }
  }

  // TODO: change accepting uri string instead of file
  private onProjectFileDeleted(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      const c = this.getContainer(version)
      c.resolve(ResourceStore).fileDeleted(file.uri.toString())
    }
  }

  private onContentChanged(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      const c = this.getContainer(version)
      c.resolve(ResourceStore).fileChanged(file)
    }
  }

  private getContainer(version: string): DependencyContainer {
    let projectContainer = this.projectContainers.get(version)
    if (!projectContainer) {
      projectContainer = this.newContainer(version)
      this.projectContainers.set(version, container)
    }

    return projectContainer
  }

  private newContainer(version: string): DependencyContainer {
    const childContainer = container.createChildContainer()
    childContainer.register('RimWorldVersion', { useValue: version })

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
