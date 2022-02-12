import { injectable } from 'tsyringe'
import vscode, { Uri, workspace } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './events'

const watchedExts = ['xml', 'wav', 'mp3', 'bmp', 'jpeg', 'jpg', 'png', 'dll']
export const globPattern = `**/*.{${watchedExts.join(',')}}`

@injectable()
export class ProjectWatcher {
  private readonly fileSystemWatcher = workspace.createFileSystemWatcher(globPattern)

  private watching = false

  get isWatching() {
    return this.watching
  }

  constructor(private readonly client: LanguageClient) {}

  start(): void {
    if (this.isWatching) {
      return
    }

    this.fileSystemWatcher.onDidCreate(this.onDidcreate.bind(this))
    this.fileSystemWatcher.onDidChange(this.onDidChange.bind(this))
    this.fileSystemWatcher.onDidDelete(this.onDidDelete.bind(this))

    this.initLoading()

    this.watching = true
  }

  /**
   * scan all files on current workspace for initial loading
   */
  private async initLoading() {
    const uris = await vscode.workspace.findFiles(globPattern)

    for (const uri of uris) {
      this.client.sendNotification(ProjectFileAdded, { uri: uri.toString() })
    }
  }

  private async onDidcreate(uri: Uri) {
    this.client.sendNotification(ProjectFileAdded, { uri: uri.toString() })
  }

  private async onDidChange(uri: Uri) {
    this.client.sendNotification(ProjectFileChanged, { uri: uri.toString() })
  }

  private async onDidDelete(uri: Uri) {
    this.client.sendNotification(ProjectFileDeleted, { uri: uri.toString() })
  }
}
