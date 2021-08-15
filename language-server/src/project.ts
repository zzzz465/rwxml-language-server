import { DefDatabase, Injectable, NameDatabase, XMLParser } from 'rwxml-analyzer'
import { DefManager } from './defManager'
import { XMLFile, File } from './fs'

export interface ProjectEvents {
  defChanged(injectables: Injectable[]): void
}

export class Project {
  public projectEvent: NodeJS.EventEmitter<ProjectEvents> = new NodeJS.EventEmitter()

  constructor(
    public readonly version: string,
    public readonly defManager: DefManager,
    public readonly defDatabase: DefDatabase,
    public readonly nameDatabase: NameDatabase
  ) {}

  FileAdded(file: File) {
    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    }
  }

  FileChanged(file: File) {
    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    }
  }

  FileDeleted(file: File) {
    if (file instanceof XMLFile) {
      this.onXMLFileDeleted(file)
    }
  }

  private onXMLFileChanged(file: XMLFile) {
    const parser = new XMLParser(file.text, file.uri.toString())
    const xmlDocument = parser.parse()

    const dirty = this.defManager.update(xmlDocument)
    this.projectEvent.emit('defChanged', dirty)
  }

  private onXMLFileDeleted(file: XMLFile) {
    const parser = new XMLParser(file.text, file.uri.toString())
    const xmlDocument = parser.parse()

    const dirty = this.defManager.update(xmlDocument)
    this.projectEvent.emit('defChanged', dirty)
  }
}
