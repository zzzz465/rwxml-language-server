import { container, injectable } from 'tsyringe'
import { Uri, workspace } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './events'

const watchedExts = ['xml', 'wav', 'mp3', 'bmp', 'jpeg', 'jpg', 'png']
const globPattern = `**/*.{${watchedExts.join(',')}}`

export function initialize() {
  const projectWatcher = container.resolve(ProjectWatcher)
  container.register(ProjectWatcher, { useValue: projectWatcher })
}

@injectable()
export class ProjectWatcher {
  private readonly fileSystemWatcher = workspace.createFileSystemWatcher(globPattern)

  constructor(private readonly client: LanguageClient) {
    this.fileSystemWatcher.onDidCreate(this.onDidcreate.bind(this))
    this.fileSystemWatcher.onDidChange(this.onDidChange.bind(this))
    this.fileSystemWatcher.onDidDelete(this.onDidDelete.bind(this))
  }

  private async onDidcreate(uri: Uri) {
    const text = Buffer.from(await workspace.fs.readFile(uri)).toString()
    this.client.sendNotification(ProjectFileAdded, { uri: uri.toString(), text })
  }

  private async onDidChange(uri: Uri) {
    const text = Buffer.from(await workspace.fs.readFile(uri)).toString()
    this.client.sendNotification(ProjectFileChanged, { uri: uri.toString(), text })
  }

  private async onDidDelete(uri: Uri) {
    this.client.sendNotification(ProjectFileDeleted, { uri: uri.toString() })
  }
}
