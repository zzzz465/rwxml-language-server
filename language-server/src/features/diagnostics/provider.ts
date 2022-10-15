import { Def, Document, TypedElement } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import * as ls from 'vscode-languageserver'
import winston from 'winston'
import { Configuration } from '../../configuration'
import defaultLogger, { withClass } from '../../log'
import { Project } from '../../project'
import { ProjectManager } from '../../projectManager'
import { Provider } from '../provider'
import { getRootElement } from '../utils'
import { DiagnosticsContributor } from './contributor'

/**
 * DiagnosticsProvider provides code diganostics.
 * TODO: add clear(document) when file removed from pool.
 */
@tsyringe.injectable()
export class DiagnosticsProvider implements Provider {
  private connection?: ls.Connection = undefined

  private log = winston.createLogger({
    format: winston.format.combine(withClass(DiagnosticsProvider)),
    transports: [defaultLogger()],
  })

  constructor(
    private readonly projectManager: ProjectManager,
    private readonly configuration: Configuration,
    @tsyringe.injectAll(DiagnosticsContributor.token) private readonly contributors: DiagnosticsContributor[]
  ) {
    projectManager.events.on('onProjectInitialized', this.onProjectInitialized.bind(this))
    configuration.events.on('onConfigurationChanged', this.onConfigurationChanged.bind(this))
  }

  init(connection: ls.Connection): void {
    this.connection = connection
  }

  private onProjectInitialized(project: Project): void {
    this.subscribeProject(project)
    this.evaluateAllDocuments(project)
  }

  private subscribeProject(project: Project): void {
    project.event.on('projectReloaded', () => this.evaluateAllDocuments(project))
    project.event.on('defChanged', (document, nodes) => this.onDefChanged(project, document, nodes))
    project.event.on('xmlDeleted', (uri) => this.clearDiagnostics(uri))
  }

  private async evaluateAllDocuments(project: Project): Promise<void> {
    const documents = project.getXMLDocuments()

    for await (const doc of documents) {
      await this.evaluateDocument(project, doc, [])
    }
  }

  private async onDefChanged(project: Project, document: Document, dirtyNodes: (Def | TypedElement)[]): Promise<void> {
    // because node.document is plain document, not documentWithNodeMap.
    const documents = AsEnumerable(dirtyNodes)
      .Select((node) => project.getXMLDocumentByUri(node.document.uri))
      .Where((doc) => !!doc)
      .Cast<Document>()
      .Distinct((x) => x.uri)
      .ToArray()

    for (const doc of documents.concat(document)) {
      await this.evaluateDocument(project, doc, dirtyNodes)
    }
  }

  private async evaluateDocument(
    project: Project,
    document: Document,
    dirtyNodes: (Def | TypedElement)[]
  ): Promise<void> {
    // TODO: add option to control each contributors?
    if (!(await this.enabled())) {
      return
    }

    this.sendDiagnostics(project, document, dirtyNodes)
  }

  async sendDiagnostics(project: Project, document: Document, dirtyNodes: (Def | TypedElement)[]): Promise<void> {
    if (!this.connection) {
      throw new Error('this.connection is undefined. check DiagnosticsProvider is initialized with init()')
    }

    const projectReady = project.state === 'ready'
    const uriValid = document.uri !== ''
    const dependencyFile = project.resourceStore.isDependencyFile(document.uri)
    const RootIsDefsNode = getRootElement(document)?.tagName === 'Defs'

    if (!(projectReady && uriValid && !dependencyFile && RootIsDefsNode)) {
      return
    }

    const shouldDiagnosis =
      document.uri !== '' &&
      !project.resourceStore.isDependencyFile(document.uri) &&
      getRootElement(document)?.tagName === 'Defs' &&
      project.state === 'ready'

    if (!shouldDiagnosis) {
      return
    }

    const diagnosticsArr = this.diagnoseDocument(project, document, dirtyNodes)

    for (const dig of diagnosticsArr) {
      if (dig.uri === document.uri) {
        this.connection?.sendDiagnostics({ uri: dig.uri, diagnostics: dig.diagnostics })
        this.log.debug(`[${project.version}] send diagnostics to uri: ${dig.uri}, items: ${dig.diagnostics.length}`)
        // this.log.silly(`${jsonStr(dig.diagnostics)}`)
      } else {
        this.log.warn(
          `tried to send diagnostics which is not allowed in this context. target: ${dig.uri}, document: ${document.uri}`
        )
      }
    }
  }

  clearDiagnostics(uri: string): void {
    this.connection?.sendDiagnostics({ uri, diagnostics: [] })
  }

  private diagnoseDocument(
    project: Project,
    document: Document,
    dirtyNodes: (Def | TypedElement)[]
  ): { uri: string; diagnostics: ls.Diagnostic[] }[] {
    return AsEnumerable(this.contributors)
      .Select((contributor) => contributor.getDiagnostics(project, document, dirtyNodes))
      .GroupBy((x) => x.uri)
      .Select((x) => ({
        uri: x.key,
        diagnostics: AsEnumerable(x.values())
          .SelectMany((y) => y.diagnostics)
          .ToArray(),
      }))
      .ToArray()
  }

  private async enabled(): Promise<boolean> {
    const value = (await this.configuration.get<any>({ section: 'rwxml.diagnostics' })).enabled
    return value !== false
  }

  private async onConfigurationChanged(): Promise<void> {
    await this.diagnoseWorkspace()
  }

  private async diagnoseWorkspace(): Promise<void> {
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
      this.clearDiagnosticsOfProject(project)
    }
  }

  private clearDiagnosticsOfProject(project: Project): void {
    for (const [uri] of project.resourceStore.xmls) {
      this.clearDiagnostics(uri)
    }
  }
}
