import * as vscode from 'vscode'
import * as tsyringe from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { DefListRequest } from '../events'
import yaml from 'js-yaml'

export function registerFeature() {
  const instance = tsyringe.container.resolve(DisplayDefs)
  return vscode.commands.registerCommand('rwxml:debug:displayDefs', instance.callback.bind(instance))
}

@tsyringe.singleton()
class DisplayDefs {
  constructor(private readonly client: LanguageClient) {}

  async callback() {
    const version = await this.askProjectVersion()
    if (!version) {
      return vscode.window.showInformationMessage('user canceled the task.')
    }

    try {
      const content = await this.requestDefs(version)
      const doc = await vscode.workspace.openTextDocument({ language: 'yaml', content })
      await vscode.window.showTextDocument(doc)
    } catch (err) {
      vscode.window.showErrorMessage(`displayDefs failed ${String(err)}`)
    }
  }

  private async askProjectVersion(): Promise<string> {
    const inputBox = vscode.window.createInputBox()
    inputBox.show()

    const acceptedPromise = new Promise((res) => {
      inputBox.onDidAccept(res)
    })

    const rejectedPromise = new Promise((res) => {
      inputBox.onDidHide(res)
    })

    // https://stackoverflow.com/questions/36734900/what-happens-if-you-dont-resolve-or-reject-a-promise
    await Promise.race([acceptedPromise, rejectedPromise])
    inputBox.hide()
    const value = inputBox.value
    inputBox.dispose()

    return value
  }

  private async requestDefs(version: string): Promise<string> {
    const res = await this.client.sendRequest(DefListRequest, { version }, undefined)
    if (res.error) {
      throw new Error(String(res.error))
    }

    const marshalled = yaml.dump(res.data, {
      indent: 2,
    })

    return marshalled
  }
}
