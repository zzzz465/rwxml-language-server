import { EventEmitter } from 'events'
import { DefDatabase, Injectable, NameDatabase, XMLDocument, XMLParser } from '@rwxml/analyzer'
import { TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { DefManager } from './defManager'
import { XMLFile, File } from './fs'
import { TextDocumentManager } from './textDocumentManager'
import { RangeConverter } from './utils/rangeConverter'

export interface ProjectEvents {
  defChanged(injectables: Injectable[]): void
}

export class Project {
  public projectEvent: EventEmitter<ProjectEvents> = new EventEmitter()
  private xmlDocumentMap: Map<string, XMLDocument> = new Map()

  constructor(
    public readonly version: string,
    public readonly defManager: DefManager,
    private readonly defDatabase: DefDatabase,
    public readonly nameDatabase: NameDatabase,
    public readonly rangeConverter: RangeConverter,
    private readonly textDocumentManager: TextDocumentManager
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

  getTextDocumentByUri(uri: string | URI) {
    if (uri instanceof URI) {
      uri = uri.toString()
    }

    return this.textDocumentManager.get(uri)
  }

  private onXMLFileChanged(file: XMLFile) {
    const uri = file.uri.toString()
    const parser = new XMLParser(file.text, uri)
    const xmlDocument = parser.parse() as XMLDocument

    this.xmlDocumentMap.set(uri, xmlDocument)
    this.textDocumentManager.set(uri, file.text)

    const dirty = this.defManager.update(xmlDocument)
    this.projectEvent.emit('defChanged', dirty)
  }

  private onXMLFileDeleted(file: XMLFile) {
    const uri = file.uri.toString()
    const parser = new XMLParser(file.text, uri)
    const xmlDocument = parser.parse() as XMLDocument

    this.textDocumentManager.delete(uri)

    const dirty = this.defManager.update(xmlDocument)
    this.projectEvent.emit('defChanged', dirty)
  }
}
