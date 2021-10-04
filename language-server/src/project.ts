import { EventEmitter } from 'events'
import { Def, DefDatabase, Document, Injectable, NameDatabase, parse } from '@rwxml/analyzer'
import { URI } from 'vscode-uri'
import { DefManager } from './defManager'
import { XMLFile, File, DependencyFile, DLLFile } from './fs'
import { TextDocumentManager } from './textDocumentManager'
import { RangeConverter } from './utils/rangeConverter'
import { About } from './mod'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { DefaultDictionary } from 'typescript-collections'
import { ModManager } from './mod/modManager'
import { ResourceManager } from './fs/resourceManager'
import { container, injectable } from 'tsyringe'
import { LoadFolder } from './mod/loadfolders'
import { DependencyRequester } from './dependencyRequester'
import * as winston from 'winston'

// event that Project will emit
export interface ProjectEvents {
  defChanged(injectables: (Injectable | Def)[]): void
}

// events that Project will listen
interface ListeningEvents {
  fileAdded(file: File): void
  fileChanged(file: File): void
  fileDeleted(file: File): void
}

@injectable()
export class Project {
  public readonly projectEvent: EventEmitter<ProjectEvents> = new EventEmitter()
  private xmlDocumentMap: Map<string, Document> = new Map()
  // Map<uri, File>
  private files: Map<string, File> = new Map()
  private _DLLfiles: Map<string, DLLFile> = new Map()
  private format = winston.format.printf((info) => `[${this.version}] ${info.message}`)
  private log = winston.createLogger({ transports: log, format: this.format })

  get dllFiles(): DLLFile[] {
    return [...this._DLLfiles.values()]
  }

  // Dict<packageId, Set<uri>>
  private dependencyFiles: DefaultDictionary<string, Set<DependencyFile>> = new DefaultDictionary(() => new Set())
  public readonly about: About = container.resolve(About)
  public readonly modManager: ModManager = container.resolve(ModManager)
  public readonly rangeConverter: RangeConverter = container.resolve(RangeConverter)
  private readonly textDocumentManager: TextDocumentManager = container.resolve(TextDocumentManager)
  public resourceManager!: ResourceManager
  public defManager!: DefManager

  // delay firing dependencyRequest in case of more changes happen after.
  private dependencyRequestTimeout: NodeJS.Timeout | null = null
  private requestLock = false
  private readonly dependencyRequestTimeoutTime = 3000 // 3 second

  constructor(public readonly version: RimWorldVersion) {
    this.reload()
    this.triggerRequestDependencies()
  }

  private triggerRequestDependencies() {
    if (this.requestLock) {
      return
    }

    if (this.dependencyRequestTimeout) {
      this.dependencyRequestTimeout.refresh()
    } else {
      this.dependencyRequestTimeout = setTimeout(this.requestDependencies.bind(this), this.dependencyRequestTimeoutTime)
    }
  }

  private async requestDependencies() {
    if (this.requestLock) {
      return
    }

    this.log.debug(`acquiring project lock, version: ${this.version}`)
    this.requestLock = true
    const requester = container.resolve(DependencyRequester)

    try {
      this.log.debug('sending requests...')
      const res = await requester.requestDependencies({
        dependencies: this.about.modDependencies,
        dlls: this.dllFiles.map((file) => file.uri),
        version: this.version,
      })

      this.log.debug(`received dependencyRequest, items: ${res.items.length}, dlls: ${res.typeInfos.length}`)

      // update typeInfos only if data is sent.
      if (res.typeInfos.length > 0) {
        const typeInfoMapManager = container.resolve(TypeInfoMapManager)
        typeInfoMapManager.updateTypeInfo(this.version, res.typeInfos)
      }

      // add all requested files
      for (const item of res.items) {
        for (const def of item.defs) {
          const file = File.create({
            uri: URI.parse(def.uri),
            text: def.text,
            ownerPackageId: item.packageId,
            readonly: item.readonly,
          })

          this.fileAdded(file)
        }
      }

      // re-evaluate all files using new TypeInfo
      this.reload()
    } catch (err) {
      this.log.error(err)
      this.reload()
    }

    this.log.debug(`releasing project lock, version: ${this.version}`)
    this.requestLock = false
    this.dependencyRequestTimeout = null
  }

  /**
   * resets all variables and parse files.
   */
  private reload() {
    const loadFolder = container.resolve(LoadFolder)
    const typeInfoMapManager = container.resolve(TypeInfoMapManager)
    const typeInfoMap = typeInfoMapManager.getTypeInfoMap(this.version)

    this.resourceManager = new ResourceManager(this.version, loadFolder)
    this.defManager = new DefManager(new DefDatabase(), new NameDatabase(), typeInfoMap)

    this.resourceManager.listen(this.projectEvent)

    this.reloadAllXMLFiles()
  }

  private reloadAllXMLFiles() {
    for (const file of this.files) {
      if (file instanceof XMLFile) {
        this.onXMLFileChanged(file)
      }
    }
  }

  isDependencyFile(uri: string | URI): boolean | undefined {
    if (uri instanceof URI) {
      uri = uri.toString()
    }

    const file = this.files.get(uri)
    if (!file) {
      return undefined
    }

    if (DependencyFile.is(file)) {
      return this.dependencyFiles.getValue(file.ownerPackageId).has(file)
    }

    return undefined
  }

  getXMLDocumentByUri(uri: string | URI) {
    if (uri instanceof URI) {
      uri = uri.toString()
    }

    return this.xmlDocumentMap.get(uri)
  }

  getTextDocumentByUri(uri: string | URI) {
    if (uri instanceof URI) {
      uri = uri.toString()
    }

    return this.textDocumentManager.get(uri)
  }

  listen(eventEmitter: EventEmitter<ListeningEvents>) {
    eventEmitter.on('fileAdded', this.fileAdded.bind(this))
    eventEmitter.on('fileChanged', this.fileChanged.bind(this))
    eventEmitter.on('fileDeleted', this.fileDeleted.bind(this))
  }

  fileAdded(file: File) {
    this.files.set(file.uri.toString(), file)

    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    } else if (file instanceof DLLFile) {
      this.onDLLFileAdded(file)
    }
  }

  fileChanged(file: File) {
    this.files.set(file.uri.toString(), file)

    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    }
  }

  fileDeleted(file: File) {
    this.files.delete(file.uri.toString())

    if (file instanceof XMLFile) {
      this.onXMLFileDeleted(file)
    } else if (file instanceof DLLFile) {
      this.onDLLFileDeleted(file)
    }
  }

  private onXMLFileChanged(file: XMLFile) {
    this.onDefFileChanged(file)
  }

  private onXMLFileDeleted(file: XMLFile) {
    this.onDefFileDeleted(file)
  }

  private onDefFileChanged(file: XMLFile) {
    this.log.debug(`def changed, uri: ${file.toString()}`)
    const uri = file.uri.toString()
    const document = parse(file.text, uri)

    this.xmlDocumentMap.set(uri, document)
    this.textDocumentManager.set(uri, file.text)

    if (DependencyFile.is(file)) {
      this.dependencyFiles.getValue(file.ownerPackageId).add(file)
    }

    const dirty = this.defManager.update(document)
    this.projectEvent.emit('defChanged', dirty)
  }

  private onDefFileDeleted(file: XMLFile) {
    this.log.debug(`def deleted, version: ${this.version}, uri: ${file.toString()}`)
    const uri = file.uri.toString()
    const document = parse(file.text, uri)

    this.textDocumentManager.delete(uri)
    if (DependencyFile.is(file)) {
      this.dependencyFiles.getValue(file.ownerPackageId).delete(file)
    }

    const dirty = this.defManager.update(document)
    this.projectEvent.emit('defChanged', dirty)
  }

  private onDLLFileAdded(file: DLLFile) {
    this._DLLfiles.set(file.uri.toString(), file)
    this.triggerRequestDependencies()
  }

  private onDLLFileDeleted(file: DLLFile) {
    this._DLLfiles.delete(file.uri.toString())
    this.triggerRequestDependencies()
  }
}
