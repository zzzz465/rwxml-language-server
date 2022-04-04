import { EventEmitter } from 'events'
import { Def, DefDatabase, Document, Injectable, NameDatabase, parse, TypeInfoMap } from '@rwxml/analyzer'
import { URI } from 'vscode-uri'
import { DefManager } from './defManager'
import { DependencyFile } from './fs'
import { TextDocumentManager } from './textDocumentManager'
import { About } from './mod'
import { ResourceStore } from './resourceStore'
import { container, inject, Lifecycle, scoped } from 'tsyringe'
import * as winston from 'winston'
import { TextDocument } from 'vscode-languageserver-textdocument'
import _ from 'lodash'
import { RimWorldVersion, RimWorldVersionToken } from './RimWorldVersion'
import { TypeInfoMapProvider } from './typeInfoMapProvider'
import { CancellationToken, CancellationTokenSource } from 'vscode-languageserver'
import { v4 as uuid } from 'uuid'
import { LogToken } from './log'
import * as documentWithNodeMap from './documentWithNodeMap'
import { serializeError } from 'serialize-error'

interface Events {
  /**
   * defChanged event emitted when document is changed
   * @param updatedDocument the document that updated
   * @param dirtyNodes project-wide dirty node due to the document update
   */
  defChanged(updatedDocument: Document, dirtyNodes: (Injectable | Def)[]): void

  projectReloaded(): void
}

@scoped(Lifecycle.ContainerScoped)
export class Project {
  private logFormat = winston.format.printf(
    (info) => `[${info.level}] [${ResourceStore.name}] [${this.version}] ${info.message}`
  )
  private readonly log: winston.Logger

  private xmls: Map<string, Document> = new Map()
  public defManager: DefManager

  public readonly event: EventEmitter<Events> = new EventEmitter()

  private isReloading = false
  private reloadDebounceTimeout = 3000 // ms
  private cancelTokenSource = new CancellationTokenSource()

  constructor(
    public readonly about: About,
    @inject(RimWorldVersionToken) public readonly version: RimWorldVersion,
    public readonly resourceStore: ResourceStore,
    private readonly typeInfoMapProvider: TypeInfoMapProvider,
    @inject(LogToken) baseLogger: winston.Logger
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })

    this.defManager = new DefManager(new DefDatabase(), new NameDatabase(), new TypeInfoMap(), this.log, this.version)

    resourceStore.event.on('xmlChanged', this.onXMLChanged.bind(this))
    resourceStore.event.on('xmlDeleted', this.onXMLDeleted.bind(this))
    resourceStore.event.on('dllChanged', () => this.reloadProject('dll is changed.'))
    resourceStore.event.on('dllDeleted', () => this.reloadProject('dll is deleted.'))

    this.reloadProject('project initialize')
  }

  /**
   * @deprecated use resourceStore directly
   * @param uri
   * @returns
   */
  isDependencyFile(uri: string | URI): boolean {
    if (uri instanceof URI) {
      uri = uri.toString()
    }

    // does this file belongs to this project?
    const file = this.resourceStore.files.get(uri)
    if (!file) {
      return false
    }

    if (DependencyFile.is(file)) {
      this.resourceStore.depFiles.getValue(file.ownerPackageId).has(file.uri.toString())
    }

    return false
  }

  getXMLDocumentByUri(uri: string | URI): Document | undefined {
    if (uri instanceof URI) {
      uri = uri.toString()
    }

    return this.xmls.get(uri)
  }

  getTextDocumentByUri(uri: string | URI): TextDocument | undefined {
    if (uri instanceof URI) {
      uri = uri.toString()
    }

    // NOTE: does this create perf issue?
    const textDocumentManager = container.resolve(TextDocumentManager)

    return textDocumentManager.get(uri)
  }

  getXMLDocuments(): Document[] {
    return [...this.xmls.values()]
  }

  /**
   * reloadProject reset project and evaluate all xmls
   * uses debounce to limit reloading too often
   */
  private reloadProject = _.debounce(async (reason = '') => {
    const requestId = uuid()
    if (this.isReloading) {
      this.reloadProject(reason + ' (retry)')
      return
    }

    this.log.info(`[${requestId}] reloading project... reason: ${reason}`)
    this.isReloading = true

    this.cancelTokenSource.cancel()
    const cancelTokenSource = new CancellationTokenSource()
    this.cancelTokenSource = cancelTokenSource
    const cancelToken = this.cancelTokenSource.token

    this.log.info(`[${requestId}] loading project resources...`)
    this.resourceStore.reload()

    this.log.info(`[${requestId}] clear project...`)
    await this.reset(requestId, cancelToken)

    if (!cancelToken.isCancellationRequested) {
      this.log.info(`[${requestId}] project cleared.`)
      this.evaluteProject()
      this.event.emit('projectReloaded')
      this.log.info(`[${requestId}] project evaluated.`)
    } else {
      this.log.info(`[${requestId}] project evluation canceled.`)
    }

    cancelTokenSource.dispose()
    this.isReloading = false
  }, this.reloadDebounceTimeout)

  /**
   * reset project to initial state
   */
  private async reset(requestId: string = uuid(), cancelToken?: CancellationToken) {
    this.log.debug(
      // TODO: put uuid as log format
      `[${requestId}] current project file dlls: ${JSON.stringify(
        [...this.resourceStore.dllFiles.values()].map((uri) => decodeURIComponent(uri)),
        null,
        2
      )}`
    )
    const [typeInfoMap, err0] = await this.getTypeInfo(requestId)
    if (cancelToken?.isCancellationRequested) {
      return
    }

    if (err0) {
      this.log.error(
        `[${requestId}] failed fetching typeInfoMap. error: ${JSON.stringify(serializeError(err0), null, 4)}`
      )
    }

    this.xmls = new Map()
    this.defManager = new DefManager(new DefDatabase(), new NameDatabase(), typeInfoMap, this.log, this.version)
  }

  async getTypeInfo(requestId: string = uuid()) {
    return this.typeInfoMapProvider.get(requestId)
  }

  /**
   * evaluteProject performs parsing on all document on resourceStore
   */
  private evaluteProject() {
    for (const [uri, raw] of this.resourceStore.xmls) {
      this.parseXML(uri, raw)
    }
  }

  private async onXMLChanged(uri: string): Promise<void> {
    const xml = this.resourceStore.xmls.get(uri)
    if (!xml) {
      this.log.warn(`file ${uri} is changed but xml not exists on resourceStore`)
      return
    }

    this.parseXML(uri, xml)
  }

  private async onXMLDeleted(uri: string): Promise<void> {
    this.parseXML(uri, '')
  }

  /**
   * parse XML and register/update/delete defs to project
   * @param uri uri of the file of the xml
   * @param raw xml string, must be parsable
   */
  private parseXML(uri: string, raw: string) {
    const document = documentWithNodeMap.create(parse(raw, uri))

    this.xmls.set(uri, document)

    const dirtyDefs = this.defManager.update(document)
    if (!this.isReloading) {
      this.event.emit('defChanged', document, dirtyDefs)
    }
  }
}
