import { EventEmitter } from 'events'
import { DefDatabase, Document, Injectable, NameDatabase, parse } from '@rwxml/analyzer'
import { URI } from 'vscode-uri'
import { DefManager } from './defManager'
import { XMLFile, File } from './fs'
import { TextDocumentManager } from './textDocumentManager'
import { RangeConverter } from './utils/rangeConverter'
import { About, Dependency } from './mod'
import _ from 'lodash'
import path from 'path'
import { RimWorldVersion } from './typeInfoMapManager'
import { MultiDictionary } from 'typescript-collections'
import { AsEnumerable } from 'linq-es2015'

export interface ProjectEvents {
  requestDependencyMods(version: RimWorldVersion, dependencies: Dependency[]): void
  defChanged(injectables: Injectable[]): void
}

export class Project {
  public readonly projectEvent: EventEmitter<ProjectEvents> = new EventEmitter()
  private readonly about = new About()
  private xmlDocumentMap: Map<string, Document> = new Map()
  private dependencyFiles: MultiDictionary<string, string> = new MultiDictionary(undefined, undefined, true)

  constructor(
    public readonly version: RimWorldVersion,
    public readonly defManager: DefManager,
    private readonly defDatabase: DefDatabase,
    public readonly nameDatabase: NameDatabase,
    public readonly rangeConverter: RangeConverter,
    private readonly textDocumentManager: TextDocumentManager
  ) {
    this.about.eventEmitter.on('dependencyModsChanged', this.onDependencyModsChanged.bind(this))
  }

  FileAdded(file: File) {
    console.log(`file added: ${file.uri.toString()}`)
    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    }
  }

  FileChanged(file: File) {
    console.log(`file changed: ${file.uri.toString()}`)
    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    }
  }

  FileDeleted(file: File) {
    console.log(`file deleted: ${file.uri.toString()}`)
    if (file instanceof XMLFile) {
      this.onXMLFileDeleted(file)
    }
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

  private onXMLFileChanged(file: XMLFile) {
    if (this.isAboutFile(file)) {
      console.log(`about updated, uri: ${decodeURIComponent(file.uri.toString())}`)
      this.about.updateAboutXML(file.text)
    } else {
      this.onDefFileChanged(file)
    }
  }

  private onXMLFileDeleted(file: XMLFile) {
    if (this.isAboutFile(file)) {
      this.about.updateAboutXML('')
    } else {
      this.onDefFileDeleted(file)
    }
  }

  private onDefFileChanged(file: XMLFile) {
    const uri = file.uri.toString()
    const document = parse(file.text, uri)

    this.xmlDocumentMap.set(uri, document)
    this.textDocumentManager.set(uri, file.text)

    const dirty = this.defManager.update(document)
    this.projectEvent.emit('defChanged', dirty)
  }

  private onDefFileDeleted(file: XMLFile) {
    const uri = file.uri.toString()
    const document = parse(file.text, uri)

    this.textDocumentManager.delete(uri)

    const dirty = this.defManager.update(document)
    this.projectEvent.emit('defChanged', dirty)
  }

  private isAboutFile({ uri }: File) {
    const fsPath = uri.fsPath
    const name = path.basename(path.normalize(fsPath))
    const dirname = path.basename(path.dirname(fsPath))

    return dirname.toLowerCase() === 'about' && name.toLowerCase() === 'about.xml'
  }

  private onDependencyModsChanged(oldVal: Dependency[], newVal: Dependency[]) {
    const added = _.difference(newVal, oldVal)
    const removed = _.difference(oldVal, newVal)

    const removedFiles = AsEnumerable(removed)
      .Select((dep) => this.dependencyFiles.getValue(dep.packageId))
      .SelectMany((it) => it)
      .Select((uri) => File.create({ uri: URI.parse(uri) }))

    for (const file of removedFiles) {
      this.FileDeleted(file)
    }

    this.projectEvent.emit('requestDependencyMods', this.version, added)
  }
}
