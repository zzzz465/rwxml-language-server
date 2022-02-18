import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import { File } from './fs'
import { LoadFolder } from './mod/loadfolders'
import { NotificationEvents } from './notificationEventManager'
import { Project } from './project'
import { RimWorldVersionToken } from './RimWorldVersion'
import * as winston from 'winston'
import { About } from './mod'
/**
 * ProjectManager manages DI container of specific rimworld version
 * and dispatch various events to each container
 */
@tsyringe.singleton()
export class ProjectManager {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${ProjectManager.name}] ${info.message}`)
  private readonly log = winston.createLogger({ transports: log.transports, format: this.logFormat })

  private readonly projectContainers: Map<string, tsyringe.DependencyContainer> = new Map()

  get projects(): Project[] {
    return [...this.projectContainers.values()].map((c) => c.resolve(Project))
  }

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

    for (const proj of this.projects) {
      proj.resourceStore.fileAdded(file)
    }
  }

  private onProjectFileChanged(file: File) {
    this.log.debug(`file changed: ${file.uri}`)

    for (const proj of this.projects) {
      proj.resourceStore.fileChanged(file)
    }
  }

  private onProjectFileDeleted(uri: string) {
    this.log.debug(`file deleted: ${uri}`)

    for (const proj of this.projects) {
      proj.resourceStore.fileDeleted(uri)
    }
  }

  private getOrCreateContainer(version: string): tsyringe.DependencyContainer {
    let projectContainer = this.projectContainers.get(version)
    if (!projectContainer) {
      projectContainer = this.newContainer(version)
      this.projectContainers.set(version, projectContainer)
    }

    return projectContainer
  }

  private newContainer(version: string): tsyringe.DependencyContainer {
    const childContainer = tsyringe.container.createChildContainer()
    childContainer.register(RimWorldVersionToken, { useValue: version })

    return childContainer
  }
}
