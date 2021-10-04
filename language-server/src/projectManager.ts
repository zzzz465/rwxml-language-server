import EventEmitter from 'events'
import { container, singleton } from 'tsyringe'
import { DependencyFile, File } from './fs'
import { LoadFolder } from './mod/loadfolders'
import { Project } from './project'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'

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

@singleton()
export class ProjectManager {
  public readonly event: EventEmitter<ProjectManagerEvent> = new EventEmitter()
  private projects: Map<RimWorldVersion, Project> = new Map()
  private readonly loadFolder: LoadFolder
  private readonly typeInfoMapManager: TypeInfoMapManager

  constructor() {
    this.loadFolder = container.resolve(LoadFolder)
    this.typeInfoMapManager = container.resolve(TypeInfoMapManager)
  }

  listen(notiEvent: EventEmitter<ListeningEvents>): void {
    notiEvent.on('projectFileAdded', this.onProjectFileAdded.bind(this))
    notiEvent.on('projectFileChanged', this.onProjectFileChanged.bind(this))
    notiEvent.on('projectFileDeleted', this.onProjectFileDeleted.bind(this))
    notiEvent.on('workspaceInitialized', this.onWorkspaceInitialization.bind(this))
    notiEvent.on('contentChanged', this.onContentChanged.bind(this))
  }

  getProject(version: RimWorldVersion): Project {
    let project = this.projects.get(version)

    if (!project) {
      project = this.newProject(version)
      this.projects.set(version, project)
    }

    return project
  }

  private newProject(version: RimWorldVersion): Project {
    const eventFilter = new EventVersionFilter(version, this.loadFolder)
    const project = new Project(version)

    eventFilter.listen(this.event)
    project.listen(eventFilter.event)

    return project
  }

  onProjectFileAdded(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      this.ensureProjectOfVersionExists(version)
      this.event.emit('fileAdded', version, file)
    }
  }

  onProjectFileChanged(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      this.ensureProjectOfVersionExists(version)
      this.event.emit('fileChanged', version, file)
    }
  }

  onProjectFileDeleted(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      this.ensureProjectOfVersionExists(version)
      this.event.emit('fileDeleted', version, file)
    }
  }

  onWorkspaceInitialization(files: File[]) {
    log.debug(`received workspaceInitialization event, file count: ${files.length}`)
    for (const file of files) {
      const versions = this.loadFolder.isBelongsTo(file.uri)

      for (const version of versions) {
        this.ensureProjectOfVersionExists(version)
        this.event.emit('fileAdded', version, file)
      }
    }
  }

  onContentChanged(file: File) {
    const versions = this.loadFolder.isBelongsTo(file.uri)

    for (const version of versions) {
      this.ensureProjectOfVersionExists(version)
      this.event.emit('fileChanged', version, file)
    }
  }

  private ensureProjectOfVersionExists(version: RimWorldVersion): void {
    this.getProject(version)
  }
}

// checks event is acceptable, ignore if not.
type ExcludeFirstParameter<F> = F extends (version: RimWorldVersion, ...args: infer P) => infer R
  ? (...args: P) => R
  : never

type EventVersionFilterEvent = {
  [event in keyof ProjectManagerEvent]: ExcludeFirstParameter<ProjectManagerEvent[event]>
}

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
