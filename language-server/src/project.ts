import { EventEmitter } from 'events'
import { Def, DefDatabase, Document, Injectable, NameDatabase, parse, TypeInfoMap } from '@rwxml/analyzer'
import { URI } from 'vscode-uri'
import { DefManager } from './defManager'
import { XMLFile, File, DependencyFile, DLLFile } from './fs'
import { TextDocumentManager } from './textDocumentManager'
import { RangeConverter } from './utils/rangeConverter'
import { About } from './mod'
import { RimWorldVersion, TypeInfoMapManager } from './typeInfoMapManager'
import { DefaultDictionary } from 'typescript-collections'
import { AsEnumerable } from 'linq-es2015'
import { ModManager } from './mod/modManager'
import { ResourceManager } from './fs/resourceManager'
import { container, injectable } from 'tsyringe'
import { LoadFolder } from './mod/loadfolders'

// event that Project will emit
export interface ProjectEvents {
  requestDependencyMods(sender: Project): void
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

  // delay firing dependencyRequest in case of more changes happen after.
  private dependencyRequestTimeout?: NodeJS.Timeout
  private readonly dependencyRequestTimeoutTime = 3000 // 3 second

  constructor(public readonly version: RimWorldVersion) {
    // TODO: use in-line initialization
    this.about = container.resolve(About)
    this.modManager = container.resolve(ModManager)
    this.rangeConverter = container.resolve(RangeConverter)
    this.textDocumentManager = container.resolve(TextDocumentManager)

    this.reload()
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
}
