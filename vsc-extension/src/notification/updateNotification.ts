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
    const response = await vscode.window.showInformationMessage(
      `RWXML Langauge Server: Updated to v${this.version}`,
      'OK'
    )

    // TODO: open webpage to release page
  }

  isFirstRunThisVersion() {
    const lastCheckedVersionStr = this.extensionContext.globalState.get<string | null>(
      UpdateNotification.firstRunStoreKey
    )

    if (lastCheckedVersionStr === null) {
      return true
    }

    const currVersion = semver.parse(this.version, true)
    const lastCheckedVersion = semver.parse(lastCheckedVersionStr, true)

    if (!currVersion || !lastCheckedVersion) {
      console.error(
        `cannot parse currVersion, lastCheckedVersionStr to semver. currVersion: ${this.version}, lastCheckedVersion: ${lastCheckedVersionStr}`
      )
      return true
    }

    return currVersion.compare(lastCheckedVersion) > 0
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
