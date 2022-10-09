import { injectable } from 'tsyringe'
import vscode, { Uri, workspace } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import * as winston from 'winston'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './events'
import { className, log, logFormat } from './log'
import jsonStr from './utils/json'

const watchedExts = ['xml', 'wav', 'mp3', 'bmp', 'jpeg', 'jpg', 'png', 'dll']
export const globPattern = `**/*.{${watchedExts.join(',')}}`

@injectable()
export class ProjectWatcher {
  private log = winston.createLogger({
    format: winston.format.combine(className(ProjectWatcher), logFormat),
    transports: [log],
  })

  private readonly fileSystemWatcher = workspace.createFileSystemWatcher(globPattern)

  private watching = false

  get isWatching(): boolean {
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
  private async initLoading(): Promise<void> {
    const uris = await vscode.workspace.findFiles(globPattern)
    this.log.debug(`sending initial load files. count: ${uris.length}`)
    this.log.silly(`initial load files: ${jsonStr(uris.map((uri) => decodeURIComponent(uri.toString())))}`)

    for (const uri of uris) {
      this.client.sendNotification(ProjectFileAdded, { uri: uri.toString() })
    }
  }

  private async onDidcreate(uri: Uri): Promise<void> {
    this.client.sendNotification(ProjectFileAdded, { uri: uri.toString() })
  }

  private async onDidChange(uri: Uri): Promise<void> {
    this.client.sendNotification(ProjectFileChanged, { uri: uri.toString() })
  }

  private async onDidDelete(uri: Uri): Promise<void> {
    this.client.sendNotification(ProjectFileDeleted, { uri: uri.toString() })
  }
}
