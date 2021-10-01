import { EventEmitter } from 'events'
import {
  Def,
  DefDatabase,
  Document,
  Injectable,
  NameDatabase,
  parse,
  TypeInfoInjector,
  TypeInfoMap,
} from '@rwxml/analyzer'
import { URI } from 'vscode-uri'
import { DefManager } from './defManager'
import { XMLFile, File, DependencyFile, DLLFile } from './fs'
import { TextDocumentManager } from './textDocumentManager'
import { RangeConverter } from './utils/rangeConverter'
import { About, Dependency } from './mod'
import _ from 'lodash'
import path from 'path'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { DefaultDictionary, MultiDictionary } from 'typescript-collections'
import { AsEnumerable } from 'linq-es2015'
import { ModManager } from './mod/modManager'
import { ResourceManager } from './fs/resourceManager'
import { container, injectable, Lifecycle, registry } from 'tsyringe'
import { LoadFolder } from './mod/loadfolders'

// event that Project will emit
export interface ProjectEvents {
  requestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]): void
  defChanged(injectables: (Injectable | Def)[]): void
}

// events that Project will listen
interface ListeningEvents {
  fileAdded(file: File): void
  fileChanged(file: File): void
  fileDeleted(file: File): void
  dependencyModsResponse(files: File[]): void
  typeInfoChanged(typeInfoMap: TypeInfoMap): void
}

@injectable()
export class Project {
  public readonly projectEvent: EventEmitter<ProjectEvents> = new EventEmitter()
  private xmlDocumentMap: Map<string, Document> = new Map()
  // Map<uri, File>
  private files: Map<string, File> = new Map()
  private _DLLfiles: Map<string, DLLFile> = new Map()

  get dllFiles(): DLLFile[] {
    return [...this._DLLfiles.values()]
  }

  // Dict<packageId, Set<uri>>
  private dependencyFiles: DefaultDictionary<string, Set<DependencyFile>> = new DefaultDictionary(() => new Set())
  public readonly about!: About
  public readonly modManager!: ModManager
  public readonly rangeConverter!: RangeConverter
  private readonly textDocumentManager!: TextDocumentManager
  public resourceManager!: ResourceManager
  public defManager!: DefManager

  constructor(public readonly version: RimWorldVersion) {
    this.about = container.resolve(About)
    this.modManager = container.resolve(ModManager)
    this.rangeConverter = container.resolve(RangeConverter)
    this.textDocumentManager = container.resolve(TextDocumentManager)

    this.clear()

    this.about.eventEmitter.on('dependencyModsChanged', this.onDependencyModsChanged.bind(this))
  }

  private clear() {
    const loadFolder = container.resolve(LoadFolder)
    const typeInfoMapManager = container.resolve(TypeInfoMapManager)
    const typeInfoMap = typeInfoMapManager.getTypeInfoMap(this.version)

    this.resourceManager = new ResourceManager(this.version, loadFolder)
    this.defManager = new DefManager(new DefDatabase(), new NameDatabase(), typeInfoMap)

    this.resourceManager.listen(this.projectEvent)
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
    eventEmitter.on('dependencyModsResponse', this.dependencyModsResponse.bind(this))
    eventEmitter.on('typeInfoChanged', this.onTypeInfoChanged.bind(this))
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

  dependencyModsResponse(files: File[]) {
    for (const file of files) {
      if (DependencyFile.is(file) && file instanceof XMLFile) {
        this.fileChanged(file)
      }
    }
  }

  private onXMLFileChanged(file: XMLFile) {
    this.onDefFileChanged(file)
  }

  private onXMLFileDeleted(file: XMLFile) {
    this.onDefFileDeleted(file)
  }

  private onDefFileChanged(file: XMLFile) {
    log.debug(`def changed, version: ${this.version}, uri: ${file.toString()}`)
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
    log.debug(`def deleted, version: ${this.version}, uri: ${file.toString()}`)
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
  }

  private onDLLFileDeleted(file: DLLFile) {
    this._DLLfiles.delete(file.uri.toString())
  }

  reloadDependencyMods() {
    const removedFiles = AsEnumerable(this.dependencyFiles.values())
      .SelectMany((files) => files)
      .Select(({ uri }) => File.create({ uri }))

    for (const file of removedFiles) {
      this.fileDeleted(file)
    }

    this.projectEvent.emit('requestDependencyMods', this.version, this.about.modDependencies)
  }

  private onDependencyModsChanged(oldVal: Dependency[], newVal: Dependency[]) {
    const added = _.difference(newVal, oldVal)
    const removed = _.difference(oldVal, newVal)

    const removedFiles = AsEnumerable(removed)
      .Select((dep) => this.dependencyFiles.getValue(dep.packageId))
      .SelectMany((it) => it)
      .Select(({ uri }) => File.create({ uri }))

    for (const file of removedFiles) {
      this.fileDeleted(file)
    }

    this.projectEvent.emit('requestDependencyMods', this.version, added)
  }

  private onTypeInfoChanged(typeInfoMap: TypeInfoMap) {
    const files = [...this.files]
    for (const [uri, file] of files) {
      this.fileDeleted(file)
    }

    this.clear()
    this.defManager = new DefManager(new DefDatabase(), new NameDatabase(), typeInfoMap)

    /*
    const oldFiles = [...this.files]
    this.xmlDocumentMap.clear()
    this.files.clear()
    this.dependencyFiles.clear()
    */

    for (const [uri, file] of files) {
      this.fileAdded(file)
    }
  }
}
