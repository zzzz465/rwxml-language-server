import yaml from 'js-yaml'
import ono from 'ono'
import * as tsyringe from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import { DefListRequest } from '../events'

export function registerFeature(): vscode.Disposable {
  const instance = tsyringe.container.resolve(DisplayDefs)
  return vscode.commands.registerCommand('rwxml:debug:displayDefs', instance.callback.bind(instance))
}

@tsyringe.singleton()
class DisplayDefs {
  constructor(private readonly client: LanguageClient) {}

  async callback(): Promise<void> {
    const version = await this.askProjectVersion()
    if (!version) {
      vscode.window.showInformationMessage('user canceled the task.')
      return
    }

    const content = await this.requestDefs(version)
    if (content instanceof Error) {
      vscode.window.showErrorMessage(`requestParsedTypeInfo failed. ${ono(content)}`)
      return
    }

    const doc = await vscode.workspace.openTextDocument({ language: 'yaml', content })
    await vscode.window.showTextDocument(doc)
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

  private async requestDefs(version: string): Promise<string | Error> {
    try {
      const res = await this.client.sendRequest(DefListRequest, { version }, undefined)
      return yaml.dump(res.data, { indent: 2 })
    } catch (err) {
      // TODO: handle error
      return ono(err as any)
    }
  }
}
