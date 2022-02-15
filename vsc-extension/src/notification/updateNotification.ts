import { inject, injectable, singleton } from 'tsyringe'
import * as vscode from 'vscode'
import { ExtensionContextToken } from '../extension'
import { ExtensionVersionToken } from '../version'
import * as semver from 'semver'

@singleton()
export class UpdateNotification {
  static firstRunStoreKey = 'first-run'

  constructor(
    @inject(ExtensionContextToken) private readonly extensionContext: vscode.ExtensionContext,
    @inject(ExtensionVersionToken) private readonly version: string
  ) {}

  async checkFirstRunThisVersion() {
    if (this.isFirstRunThisVersion()) {
      await this.notifyExtensionUpdated()
    }

    this.storeCurrentVersion()
  }

  async notifyExtensionUpdated() {
    const currVersion = this.getCurrentVersion()
    const storedVersion = this.getStoredVersion()
    const response = await vscode.window.showInformationMessage(
      `RWXML Langauge Server: Updated to v${currVersion.format()} from ${storedVersion.format()}`,
      'OK'
    )

    // TODO: open webpage to release page
  }

  isFirstRunThisVersion() {
    const currVersion = this.getCurrentVersion()
    const lastCheckedVersion = this.getStoredVersion()

    return currVersion.compare(lastCheckedVersion) !== 0
  }

  getDefaultVersion() {
    const defaultVersion = semver.parse('v0.0.0', true)
    if (!defaultVersion) {
      throw new Error(
        'updateNotificaion defaultVersion v0.0.0 should be parsed as semver. this is due to semver library bug'
      )
    }

    return defaultVersion
  }

  getCurrentVersion() {
    const defaultVersion = this.getDefaultVersion()
    return semver.parse(this.version, true) ?? defaultVersion
  }

  getStoredVersion() {
    const defaultVersion = this.getDefaultVersion()

    const lastCheckedVersionStr = this.extensionContext.globalState.get<string | null>(
      UpdateNotification.firstRunStoreKey
    )

    if (lastCheckedVersionStr === null) {
      return defaultVersion
    }

    return semver.parse(lastCheckedVersionStr, true) ?? defaultVersion
  }

  storeCurrentVersion() {
    const value = semver.parse(this.version, true)
    if (value === null) {
      console.error(`cannot parse ${value} as semver`)
      return
    }

    this.extensionContext.globalState.update(UpdateNotification.firstRunStoreKey, value.format())
  }
}
