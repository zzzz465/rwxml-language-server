import { DefDatabase, NameDatabase, TypeInfoInjector, TypeInfoMap } from '@rwxml/analyzer'
import EventEmitter from 'events'
import { container, singleton } from 'tsyringe'
import { DefManager } from './defManager'
import { DependencyFile, File } from './fs'
import { ResourceManager } from './fs/resourceManager'
import { About, Dependency } from './mod'
import { LoadFolder } from './mod/loadfolders'
import { ModManager } from './mod/modManager'
import { Project } from './project'
import { TextDocumentManager } from './textDocumentManager'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { RangeConverter } from './utils/rangeConverter'

// event that Projects will emit.
interface ProjectManagerEvent {
  requestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]): void
  dependencyModsResponse(_: unknown, files: File[]): void
  fileAdded(version: string, file: File): void
  fileChanged(version: string, file: File): void
  fileDeleted(version: string, file: File): void
  typeInfoChanged(version: string, typeInfoMap: TypeInfoMap): void
}

// events that ProjectManager will listen.
interface ListeningEvents {
  projectFileAdded(file: File): void
  projectFileChanged(file: File): void
  projectFileDeleted(file: File): void
  workspaceInitialized(files: File[]): void
  contentChanged(file: File): void
  typeInfoChanged(): void
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
    this.typeInfoMapManager.event.on('typeInfoChanged', this.onTypeInfoChanged.bind(this))
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
      // if project is created, it must request dependencyMods first, otherwise dependency will not loaded.
      project.reloadDependencyMods()
    }

    return project
  }

  private newProject(version: RimWorldVersion): Project {
    const eventFilter = new EventVersionFilter(version, this.loadFolder)
    const project = new Project(version)

    eventFilter.listen(this.event)
    project.listen(eventFilter.event)
    project.projectEvent.on('requestDependencyMods', this.onRequestDependencyMods.bind(this))

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

  onDependencyModsResponse(files: File[]) {
    this.event.emit('dependencyModsResponse', undefined, files)
  }

  private ensureProjectOfVersionExists(version: RimWorldVersion): void {
    this.getProject(version)
  }

  private onRequestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]) {
    this.event.emit('requestDependencyMods', version, dependencies)
  }

  private onTypeInfoChanged(version: RimWorldVersion) {
    const typeInfoMap = this.typeInfoMapManager.getTypeInfoMap(version)
    this.event.emit('typeInfoChanged', version, typeInfoMap)
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
    event.on('dependencyModsResponse', (_, files) => this.event.emit('dependencyModsResponse', files))
    event.on('typeInfoChanged', this.typeInfoChanged.bind(this))
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

  private typeInfoChanged(version: RimWorldVersion, typeInfoMap: TypeInfoMap) {
    if (this.version === version) {
      this.event.emit('typeInfoChanged', typeInfoMap)
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
