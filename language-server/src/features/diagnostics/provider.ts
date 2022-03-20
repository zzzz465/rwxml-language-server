import { Def, Document, Injectable } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import winston from 'winston'
import { Configuration } from '../../configuration'
import { LogToken } from '../../log'
import { Project } from '../../project'
import { ProjectManager } from '../../projectManager'
import { Provider } from '../provider'
import { DiagnosticsContributor } from './contributor'

/*
무엇이 필요할지 생각해보자.

- project 초기화(생성) 시 이벤트 등록하기 + 전체 검증하기 (debounce 필요)
- 변경점 많을 경우, diagnostics 대기한다음 첨부터 다시하기? (필요한가? 나중에?)
- 일단 defChanged 되면 그거 기반으로... 이것저것 해야하나?
- 그냥 파일 단위로 validation 을 하면 안되나? -> 문제 생길 수도 있지않나?
*/

/**
 * DiagnosticsProvider provides code diganostics.
 */
@tsyringe.injectable()
export class DiagnosticsProvider implements Provider {
  private connection?: ls.Connection = undefined

  private logFormat = winston.format.printf((info) => `[${info.level}] [${DiagnosticsProvider.name}] ${info.message}`)
  private readonly log: winston.Logger

  constructor(
    private readonly projectManager: ProjectManager,
    private readonly configuration: Configuration,
    @tsyringe.injectAll(DiagnosticsContributor.token) private readonly contributors: DiagnosticsContributor[],
    @tsyringe.inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
    this.projectManager.events.on('onProjectInitialized', this.subscribeProject.bind(this))
    this.configuration.events.on('onConfigurationChanged', this.onConfigurationChanged.bind(this))
  }

  init(connection: ls.Connection): void {
    this.connection = connection
  }

  subscribeProject(project: Project): void {
    project.event.on('defChanged', (document, nodes) => this.onDefChanged(project, document, nodes))
  }

  private async onDefChanged(project: Project, document: Document, dirtyNodes: (Def | Injectable)[]): Promise<void> {
    // TODO: add option to control each contributors?
    if (!(await this.enabled())) {
      return
    }

    this.sendDiagnostics(project, document, dirtyNodes)
  }

  async sendDiagnostics(project: Project, document: Document, dirtyNodes: (Def | Injectable)[]): Promise<void> {
    if (!this.connection) {
      throw new Error('this.connection is undefined. check DiagnosticsProvider is initialized with init()')
    }

    const diagnosticsArr = this.diagnoseDocument(project, document, dirtyNodes)

    for (const dig of diagnosticsArr) {
      if (dig.uri === document.uri) {
        this.connection?.sendDiagnostics({ uri: dig.uri, diagnostics: dig.diagnostics })
      } else {
        this.log.warn(
          `tried to send diagnostics which is not allowed in this context. target: ${dig.uri}, document: ${document.uri}`
        )
      }
    }
  }

  private diagnoseDocument(project: Project, document: Document, dirtyNodes: (Def | Injectable)[]) {
    return AsEnumerable(this.contributors)
      .Select((contributor) => contributor.getDiagnostics(project, document, dirtyNodes))
      .GroupBy((x) => x.uri)
      .Select((x) => ({
        uri: x.key,
        diagnostics: AsEnumerable(x.values())
          .SelectMany((y) => y.diagnostics)
          .ToArray(),
      }))
  }

  private async enabled(): Promise<boolean> {
    const value = (await this.configuration.get<any>({ section: 'rwxml.diagnostics' })).enabled
    return value !== false
  }

  private async onConfigurationChanged() {
    if (await this.enabled()) {
      this.diagnoseAllDocuments()
    } else {
      this.clearAllDiagnostics()
    }
  }

  private diagnoseAllDocuments(): void {
    for (const project of this.projectManager.projects) {
      for (const doc of project.getXMLDocuments()) {
        this.sendDiagnostics(project, doc, [])
      }
    }
  }

  private clearAllDiagnostics(): void {
    for (const project of this.projectManager.projects) {
      this.clearDiagnostics(project)
    }
  }

  private clearDiagnostics(project: Project): void {
    for (const [uri] of project.resourceStore.xmls) {
      this.connection?.sendDiagnostics({ uri, diagnostics: [] })
    }
  }
}
