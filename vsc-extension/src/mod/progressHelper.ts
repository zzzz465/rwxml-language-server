import * as vscode from 'vscode'
import * as winston from 'winston'
import { className, log, logFormat } from '../log'
import { RimWorldVersion } from './version'

export type ProgressParams = vscode.Progress<{ message?: string; increment?: number }>

export class ProgressHelper {
  private log = winston.createLogger({
    format: winston.format.combine(className(ProgressHelper), logFormat),
    transports: [log],
  })

  public static async create(version: RimWorldVersion): Promise<ProgressHelper> {
    const p = new ProgressHelper(version)
    p.disposedPromise = new Promise((res) => {
      const interval = setInterval(() => {
        if (p.disposed) {
          res(undefined)
          clearInterval(interval)
        }
      }, 500)
    })

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: `RWXML: Runtime TypeInfo Extraction (RWVersion: ${version})`,
      },
      async (progress) => {
        p.progress = progress
        return p.disposedPromise
      }
    )

    return p
  }

  public cancellationTokenSource?: vscode.CancellationTokenSource
  public progress!: ProgressParams
  private disposed = false
  public disposedPromise!: Promise<void>

  get token(): vscode.CancellationToken {
    if (this.disposed) {
      throw new Error()
    }

    if (!this.cancellationTokenSource) {
      this.cancellationTokenSource = new vscode.CancellationTokenSource()
      return this.cancellationTokenSource.token
    }

    return this.cancellationTokenSource.token
  }

  constructor(public readonly version: RimWorldVersion) {}

  report(message: string, increment?: number): void {
    this.progress.report({ message, increment })
  }

  cancel(): void {
    if (this.cancellationTokenSource) {
      this.cancellationTokenSource.cancel()
      this.cancellationTokenSource.dispose()
      this.cancellationTokenSource = undefined
    }
  }

  dispose(): void {
    if (!this.disposed) {
      this.cancellationTokenSource?.dispose()
      this.cancellationTokenSource = undefined
      this.disposed = true
    }
  }
}
