import * as semver from 'semver'
import { inject, singleton } from 'tsyringe'
import * as vscode from 'vscode'
import { ExtensionContextToken } from '../extension'
import { log } from '../log'
import { ExtensionVersionToken } from '../version'

@singleton()
export class UpdateNotification {
  static firstRunStoreKey = 'first-run'

  constructor(
    @inject(ExtensionContextToken) private readonly extensionContext: vscode.ExtensionContext,
    @inject(ExtensionVersionToken) private readonly version: string
  ) {}

  async checkFirstRunThisVersion(): Promise<void> {
    if (this.isFirstRunThisVersion()) {
      await this.notifyExtensionUpdated()
    }

    this.storeCurrentVersion()
  }

  async notifyExtensionUpdated(): Promise<void> {
    const currVersion = this.getCurrentVersion()
    const storedVersion = this.getStoredVersion()

    await vscode.window.showInformationMessage(
      `RWXML Langauge Server: Updated to v${currVersion.format()} from ${storedVersion.format()}`,
      'OK'
    )

    // TODO: open webpage to release page
  }

  isFirstRunThisVersion(): boolean {
    const currVersion = this.getCurrentVersion()
    const lastCheckedVersion = this.getStoredVersion()

    return currVersion.compare(lastCheckedVersion) !== 0
  }

  getDefaultVersion(): semver.SemVer {
    const defaultVersion = semver.parse('v0.0.0', true)
    if (!defaultVersion) {
      throw new Error(
        'updateNotificaion defaultVersion v0.0.0 should be parsed as semver. this is due to semver library bug'
      )
    }

    return defaultVersion
  }

  getCurrentVersion(): semver.SemVer {
    const defaultVersion = this.getDefaultVersion()
    return semver.parse(this.version, true) ?? defaultVersion
  }

  getStoredVersion(): semver.SemVer {
    const defaultVersion = this.getDefaultVersion()

    const lastCheckedVersionStr = this.extensionContext.globalState.get<string | null>(
      UpdateNotification.firstRunStoreKey
    )

    if (lastCheckedVersionStr === null) {
      return defaultVersion
    }

    return semver.parse(lastCheckedVersionStr, true) ?? defaultVersion
  }

  storeCurrentVersion(): void {
    const value = semver.parse(this.version, true)
    if (value === null) {
      log.error(`cannot parse ${value} as semver`)

      return
    }

    this.extensionContext.globalState.update(UpdateNotification.firstRunStoreKey, value.format())
  }
}
