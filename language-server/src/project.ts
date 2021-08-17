import { EventEmitter } from 'events'
import { DefDatabase, Injectable, NameDatabase, XMLDocument, XMLParser } from 'rwxml-analyzer'
import { URI } from 'vscode-uri'
import { DefManager } from './defManager'
import { XMLFile, File } from './fs'

export interface ProjectEvents {
  defChanged(injectables: Injectable[]): void
}

export class Project {
  public projectEvent: EventEmitter<ProjectEvents> = new EventEmitter()
  private xmlDocumentMap: Map<string, XMLDocument> = new Map()

  constructor(
    public readonly version: string,
    public readonly defManager: DefManager,
    public readonly defDatabase: DefDatabase,
    public readonly nameDatabase: NameDatabase
  ) {}

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

  private onXMLFileChanged(file: XMLFile) {
    const parser = new XMLParser(file.text, file.uri.toString())
    const xmlDocument = parser.parse() as XMLDocument

    this.xmlDocumentMap.set(file.uri.toString(), xmlDocument)

    const dirty = this.defManager.update(xmlDocument)
    this.projectEvent.emit('defChanged', dirty)
  }

  private onXMLFileDeleted(file: XMLFile) {
    const parser = new XMLParser(file.text, file.uri.toString())
    const xmlDocument = parser.parse() as XMLDocument

    this.xmlDocumentMap.delete(file.uri.toString())

    const dirty = this.defManager.update(xmlDocument)
    this.projectEvent.emit('defChanged', dirty)
  }
}
