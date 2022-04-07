import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import { File } from './fs'
import { NotificationEvents } from './notificationEventManager'
import { Project } from './project'
import { RimWorldVersionToken } from './RimWorldVersion'
import * as winston from 'winston'
import { About } from './mod'
import { inject } from 'tsyringe'
import { LogToken } from './log'
import _ from 'lodash'
import TypedEventEmitter from 'typed-emitter'

type Events = {
  onProjectInitialized(project: Project): void
}

/**
 * ProjectManager manages DI container of specific rimworld version
 * and dispatch various events to each container
 */
@tsyringe.singleton()
export class ProjectManager {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${ProjectManager.name}] ${info.message}`)
  private readonly log: winston.Logger

  private supportedVersions: string[] = []
  private readonly projectContainers: Map<string, tsyringe.DependencyContainer> = new Map()

  get projects(): Project[] {
    return [...this.projectContainers.values()].map((c) => c.resolve(Project))
  }

  public readonly events = new EventEmitter() as TypedEventEmitter<Events>

  constructor(about: About, @inject(LogToken) baseLogger: winston.Logger) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
    about.event.on('aboutChanged', this.onAboutChanged.bind(this))
  }

  listen(notiEvent: TypedEventEmitter<NotificationEvents>): void {
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

  private onAboutChanged(about: About) {
    if (!_.isEqual(this.supportedVersions, about.supportedVersions)) {
      this.setSupportedVersions(about.supportedVersions)
      this.supportedVersions = about.supportedVersions
    }
  }

  private onProjectFileAdded(file: File) {
    this.log.silly(`file added: ${file.uri.toString()}`)

    for (const proj of this.projects) {
      proj.resourceStore.fileAdded(file)
    }
  }

  private onProjectFileChanged(file: File) {
    this.log.silly(`file changed: ${file.uri}`)

    for (const proj of this.projects) {
      proj.resourceStore.fileChanged(file)
    }
  }

  private onProjectFileDeleted(uri: string) {
    this.log.silly(`file deleted: ${uri}`)

    for (const proj of this.projects) {
      proj.resourceStore.fileDeleted(uri)
    }
  }

  private getOrCreateContainer(version: string): tsyringe.DependencyContainer {
    let projectContainer = this.projectContainers.get(version)
    if (!projectContainer) {
      projectContainer = this.newContainer(version)
      this.projectContainers.set(version, projectContainer)
      this.events.emit('onProjectInitialized', projectContainer.resolve(Project))
    }

    return projectContainer
  }

  private newContainer(version: string): tsyringe.DependencyContainer {
    const childContainer = tsyringe.container.createChildContainer()
    childContainer.register(RimWorldVersionToken, { useValue: version })

    return childContainer
  }
}
