import EventEmitter from 'events'
import { Connection, TextDocumentChangeEvent, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import {
  File,
  ProjectFileAdded,
  ProjectFileAddedNotificationParams,
  ProjectFileChanged,
  ProjectFileChangedNotificationParams,
  ProjectFileDeleted,
  ProjectFileDeletedNotificationParams,
  WorkspaceInitialization,
  WorkspaceInitializationNotificationParams,
} from './fs'

// events that this manager will emit
interface NotificationEvents {
  projectFileAdded(file: File): void
  projectFileChanged(file: File): void
  projectFileDeleted(file: File): void
  workspaceInitialized(files: File[]): void
  contentChanged(file: File): void
}

interface TextDocumentListeningEvent {
  onContentChange(e: TextDocumentChangeEvent<TextDocument>): void
}

export class NotificationEventManager {
  // pre-event stage emit
  public readonly preEvent: EventEmitter<NotificationEvents> = new EventEmitter()
  // event emit
  public readonly event: EventEmitter<NotificationEvents> = new EventEmitter()
  // post-event emit?

  listen(connection: Connection, textDocumentEvent: EventEmitter<TextDocumentListeningEvent>): void {
    connection.onNotification(ProjectFileAdded, this.onProjectFileAdded.bind(this))
    connection.onNotification(ProjectFileChanged, this.onProjectFileChanged.bind(this))
    connection.onNotification(ProjectFileDeleted, this.onProjectFileDeleted.bind(this))
    connection.onNotification(WorkspaceInitialization, this.onWorkspaceInitialized.bind(this))
    textDocumentEvent.on('onContentChange', this.onContentChanged.bind(this))
  }

  private onProjectFileAdded({ uri, readonly, text }: ProjectFileAddedNotificationParams): void {
    const file = File.create({ uri: URI.parse(uri), readonly, text })
    this.preEvent.emit('projectFileAdded', file)
    this.event.emit('projectFileAdded', file)
  }
  private onProjectFileChanged({ uri, readonly, text }: ProjectFileChangedNotificationParams): void {
    const file = File.create({ uri: URI.parse(uri), readonly, text })
    this.preEvent.emit('projectFileChanged', file)
    this.event.emit('projectFileChanged', file)
  }
  private onProjectFileDeleted({ uri }: ProjectFileDeletedNotificationParams): void {
    const file = File.create({ uri: URI.parse(uri) })
    this.preEvent.emit('projectFileDeleted', file)
    this.event.emit('projectFileDeleted', file)
  }
  private onWorkspaceInitialized({ files }: WorkspaceInitializationNotificationParams): void {
    const convertedFiles = files.map((file) =>
      File.create({ uri: URI.parse(file.uri), readonly: file.readonly, text: file.text })
    )
    this.preEvent.emit('workspaceInitialized', convertedFiles)
    this.event.emit('workspaceInitialized', convertedFiles)
  }
  private onContentChanged({ document }: TextDocumentChangeEvent<TextDocument>): void {
    const file = File.create({ uri: URI.parse(document.uri), text: document.getText() })
    this.preEvent.emit('contentChanged', file)
    this.event.emit('contentChanged', file)
  }
}
