import { Injectable, XMLParser } from 'rwxml-analyzer'
import { DefManager } from './defManager'
import { XMLFile, File } from './fs/file'
import { FileEventManager } from './fs/fileEventManager'

export interface ProjectEvents {
  defChanged(injectables: Injectable[]): void
}

export class Project {
  public projectEvent: NodeJS.EventEmitter<ProjectEvents> = new NodeJS.EventEmitter()

  constructor(
    public readonly version: string,
    private readonly defManager: DefManager,
    private readonly fileEventManager: FileEventManager
  ) {
    this.fileEventManager.fileEvent.on('created', this.onFileAdded.bind(this))
    this.fileEventManager.fileEvent.on('changed', this.onFileChanged.bind(this))
    this.fileEventManager.fileEvent.on('deleted', this.onFileDeleted.bind(this))
  }

  private onFileAdded(file: File) {
    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    }
  }

  private onFileChanged(file: File) {
    if (file instanceof XMLFile) {
      this.onXMLFileChanged(file)
    }
  }

  private onFileDeleted(file: File) {
    if (file instanceof XMLFile) {
      this.onXMLFileDeleted(file)
    }
  }

  private onXMLFileChanged(file: File) {
    const parser = new XMLParser(file.text, file.uri.toString())
    const xmlDocument = parser.parse()

    const dirty = this.defManager.update(xmlDocument)
    this.projectEvent.emit('defChanged', dirty)
  }

  private onXMLFileDeleted(file: File) {
    const parser = new XMLParser(file.text, file.uri.toString())
    const xmlDocument = parser.parse()

    const dirty = this.defManager.update(xmlDocument)
    this.projectEvent.emit('defChanged', dirty)
  }
}
