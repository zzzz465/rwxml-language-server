import { injectable } from 'tsyringe'
import vscode, { Uri, workspace } from 'vscode'
import { LanguageClient, State } from 'vscode-languageclient'
import * as winston from 'winston'
import { ProjectFileAdded, ProjectFileChanged, ProjectFileDeleted } from './events'
import { className, log, logFormat } from './log'
import * as path from 'path'

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

  async start(): Promise<void> {
    if (this.isWatching) {
      return
    }

    this.log.info('Waiting for language client to be ready...')

    this.fileSystemWatcher.onDidCreate(this.onDidcreate.bind(this))
    this.fileSystemWatcher.onDidChange(this.onDidChange.bind(this))
    this.fileSystemWatcher.onDidDelete(this.onDidDelete.bind(this))

    // 等待LanguageClient完全准备好
    await this.client.onReady()

    // 等待服务器完全准备好后再加载文件
    await this.initLoading()

    this.watching = true
  }

  /**
   * scan all files on current workspace for initial loading
   */
  private async initLoading(): Promise<void> {
    // 扫描所有关注的文件
    const uris = await vscode.workspace.findFiles(globPattern)

    this.log.info(`sending initial load files. count: ${uris.length}`)

    // 分批发送，每批50个文件，每批之间延迟100ms
    const batchSize = 50
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < uris.length; i += batchSize) {
      const batch = uris.slice(i, Math.min(i + batchSize, uris.length))
      this.log.info(`sending batch ${Math.floor(i / batchSize) + 1}, size: ${batch.length}`)

      for (const uri of batch) {
        try {
          this.client.sendNotification(ProjectFileAdded, { uri: uri.toString() })
          successCount++
        } catch (e) {
          this.log.error(`Failed to send initial file ${uri}: ${e}`)
          errorCount++
        }
      }
      // 批次之间延迟，避免缓冲区溢出
      if (i + batchSize < uris.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    this.log.info(`finished sending initial load files. success: ${successCount}, errors: ${errorCount}`)
  }

  private async onDidcreate(uri: Uri): Promise<void> {
    try {
      this.client.sendNotification(ProjectFileAdded, { uri: uri.toString() })
    } catch (e) {}
  }

  private async onDidChange(uri: Uri): Promise<void> {
    try {
      this.client.sendNotification(ProjectFileChanged, { uri: uri.toString() })
    } catch (e) {}
  }

  private async onDidDelete(uri: Uri): Promise<void> {
    try {
      this.client.sendNotification(ProjectFileDeleted, { uri: uri.toString() })
    } catch (e) {}
  }
}
