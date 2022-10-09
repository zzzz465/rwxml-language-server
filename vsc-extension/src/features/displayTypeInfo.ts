import * as tsyringe from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { ParsedTypeInfoRequest } from '../events'

export function registerFeature(): vscode.Disposable {
  // TODO: refactor this code
  const instance = tsyringe.container.resolve(DisplayTypeInfo)
  return vscode.commands.registerCommand('rwxml:debug:displayTypeInfo', instance.callback.bind(instance))
}

@tsyringe.singleton()
class DisplayTypeInfo {
  constructor(private readonly client: LanguageClient) {}

  async callback(): Promise<void> {
    const version = await this.askProjectVersion()
    if (!version) {
      vscode.window.showInformationMessage('user canceled the task.')
      return
    }

    try {
      const content = await this.requestParsedTypeInfo(version)
      const doc = await vscode.workspace.openTextDocument({ language: 'json', content })
      await vscode.window.showTextDocument(doc)
    } catch (err) {
      vscode.window.showErrorMessage(`requestParsedTypeInfo failed ${String(err)}`)
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

  private async requestParsedTypeInfo(version: string): Promise<string> {
    const res = await this.client.sendRequest(ParsedTypeInfoRequest, { version }, undefined)
    if (res.error) {
      throw new Error(String(res.error))
    }

    return JSON.stringify(res.data, null, 4)
  }
}
