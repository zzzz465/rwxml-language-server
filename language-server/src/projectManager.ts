import { DefDatabase, NameDatabase, TypeInfoInjector } from '@rwxml/analyzer'
import EventEmitter from 'events'
import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { DefManager } from './defManager'
import { File, XMLDocumentDependencyRequest } from './fs'
import { About, Dependency } from './mod'
import { NotificationEventManager } from './notificationEventManager'
import { Project } from './project'
import { TextDocumentManager } from './textDocumentManager'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { RangeConverter } from './utils/rangeConverter'

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

  constructor(
    private readonly about: About,
    private readonly connection: Connection,
    private readonly typeInfoMapManager: TypeInfoMapManager,
    private readonly notificationEventManager: NotificationEventManager,
    private readonly textDocumentManager: TextDocumentManager
  ) {}

  listen(): void {
    const notiEvent = this.notificationEventManager.event
    notiEvent.on('projectFileAdded', this.onProjectFileAdded.bind(this))
    notiEvent.on('projectFileChanged', this.onProjectFileChanged.bind(this))
    notiEvent.on('projectFileDeleted', this.onProjectFileDeleted.bind(this))
    notiEvent.on('workspaceInitialized', this.onWorkspaceInitialization.bind(this))
    notiEvent.on('contentChanged', this.onContentChanged.bind(this))
    this.about.eventEmitter.on('dependencyModsChanged', this.onDependencyModsChanged.bind(this))
  }

  async getProject(version: RimWorldVersion): Promise<Project> {
    let project = this.projects.get(version)

    if (!project) {
      project = await this.newProject(version)
      this.projects.set(version, project)
    }

    return project
  }

  private async newProject(version: RimWorldVersion): Promise<Project> {
    const defDatabase = new DefDatabase()
    const nameDatabase = new NameDatabase()
    const typeInfoMap = await this.typeInfoMapManager.getTypeInfoMap(version)
    const typeInfoInjector = new TypeInfoInjector(typeInfoMap)
    const defManager = new DefManager(defDatabase, nameDatabase, typeInfoMap, typeInfoInjector)
    const project = new Project(
      this.about,
      version,
      defManager,
      defDatabase,
      nameDatabase,
      new RangeConverter(this.textDocumentManager),
      this.textDocumentManager
    )

    project.projectEvent.on('requestDependencyMods', this.onRequestDependencyMods.bind(this))

    return project
  }

  private onProjectFileAdded(file: File) {}

  private onProjectFileChanged(file: File) {}

  private onProjectFileDeleted(file: File) {}

  private onWorkspaceInitialization(files: File[]) {}

  private onContentChanged(file: File) {}

  private onDependencyModsChanged(oldVal: Dependency[], newVal: Dependency[]): void {
    throw new Error('not implemented.')
  }

  private async onRequestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]) {
    console.log(`requesting dependency of version: ${version}, dependencies: ${dependencies}`)
    const pkgIds = dependencies.map((dep) => dep.packageId)
    const res = await this.connection.sendRequest(XMLDocumentDependencyRequest, {
      version: version,
      packageIds: pkgIds,
    })

    console.log(`received dependency ${res.items.length} items from client, version: ${version}`)
    const project = await this.getProject(version)

    for (const { readonly, uri, text, packageId } of res.items) {
      project.fileAdded(File.create({ uri: URI.parse(uri), text: text, readonly, ownerPackageId: packageId }))
    }
  }
}
