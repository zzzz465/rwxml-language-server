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
export interface NotificationEvents {
  projectFileAdded(file: File): void
  projectFileChanged(file: File): void
  projectFileDeleted(file: File): void
  workspaceInitialized(files: File[]): void
  contentChanged(file: File): void
}

export class NotificationEventManager {
  public readonly event: EventEmitter<NotificationEvents> = new EventEmitter()

  listen(connection: Connection, textDocuments: TextDocuments<TextDocument>): void {
    connection.onNotification(ProjectFileAdded, this.onProjectFileAdded.bind(this))
    connection.onNotification(ProjectFileChanged, this.onProjectFileChanged.bind(this))
    connection.onNotification(ProjectFileDeleted, this.onProjectFileDeleted.bind(this))
    connection.onNotification(WorkspaceInitialization, this.onWorkspaceInitialized.bind(this))
    textDocuments.onDidChangeContent(this.onContentChanged.bind(this))
  }

  private onProjectFileAdded({ uri, readonly, text }: ProjectFileAddedNotificationParams): void {
    const file = File.create({ uri: URI.parse(uri), readonly, text })
    this.event.emit('projectFileAdded', file)
  }
  private onProjectFileChanged({ uri, readonly, text }: ProjectFileChangedNotificationParams): void {
    const file = File.create({ uri: URI.parse(uri), readonly, text })
    this.event.emit('projectFileChanged', file)
  }
  private onProjectFileDeleted({ uri }: ProjectFileDeletedNotificationParams): void {
    const file = File.create({ uri: URI.parse(uri) })
    this.event.emit('projectFileDeleted', file)
  }
  private onWorkspaceInitialized({ files }: WorkspaceInitializationNotificationParams): void {
    const convertedFiles = files.map((file) =>
      File.create({ uri: URI.parse(file.uri), readonly: file.readonly, text: file.text })
    )
    this.event.emit('workspaceInitialized', convertedFiles)
  }
  private onContentChanged({ document }: TextDocumentChangeEvent<TextDocument>): void {
    const file = File.create({ uri: URI.parse(document.uri), text: document.getText() })
    this.event.emit('contentChanged', file)
  }
}
