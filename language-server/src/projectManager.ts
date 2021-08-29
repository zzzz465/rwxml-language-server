import EventEmitter from 'events'
import { AsEnumerable } from 'linq-es2015'
import _ from 'lodash'
import { MultiDictionary } from 'typescript-collections'
import { URI } from 'vscode-uri'
import { File } from './fs'
import { About, Dependency } from './mod'
import { NotificationEventManager } from './notificationEventManager'
import { Project } from './project'
import { RimWorldVersion } from './typeInfoMapManager'

// event that Projects will emit.
interface ProjectManagerEvent {
  requestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]): void
  fileAdded(file: File): void
  fileChanged(file: File): void
  fileDeleted(file: File): void
}

export class ProjectManager {
  public readonly event: EventEmitter<ProjectManagerEvent> = new EventEmitter()
  private projects: Map<RimWorldVersion, Project> = new Map()
  private dependencyFiles: MultiDictionary<string, string> = new MultiDictionary(undefined, undefined, true)

  constructor(private readonly about: About) {}

  listen(notificationEventManager: NotificationEventManager): void {
    const notiEvent = notificationEventManager.event
    notiEvent.on('projectFileAdded', this.onProjectFileAdded.bind(this))
    notiEvent.on('projectFileChanged', this.onProjectFileChanged.bind(this))
    notiEvent.on('projectFileDeleted', this.onProjectFileDeleted.bind(this))
    notiEvent.on('workspaceInitialized', this.onWorkspaceInitialization.bind(this))
    notiEvent.on('contentChanged', this.onContentChanged.bind(this))
  }

  private onProjectFileAdded(file: File) {}

  private onProjectFileChanged(file: File) {}

  private onProjectFileDeleted(file: File) {}

  private onWorkspaceInitialization(files: File[]) {}

  private onContentChanged(file: File) {}

  private onDependencyModsChanged(oldVal: Dependency[], newVal: Dependency[]) {
    const added = _.difference(newVal, oldVal)
    const removed = _.difference(oldVal, newVal)

    const removedFiles = AsEnumerable(removed)
      .Select((dep) => this.dependencyFiles.getValue(dep.packageId))
      .SelectMany((it) => it)
      .Select((uri) => File.create({ uri: URI.parse(uri) }))

    // for (const file of removedFiles) {
    // this.fileDeleted(file)
    // }

    // this.projectEvent.emit('requestDependencyMods', this.version, added)
  }
}
