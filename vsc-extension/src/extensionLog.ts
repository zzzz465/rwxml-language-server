import vscode from 'vscode'
import Transport from 'winston-transport'
import { format } from 'winston'
import { MESSAGE } from 'triple-beam'

export class ExtensionLog extends Transport {
  private outputchannel = vscode.window.createOutputChannel('RWXML Language Server (Client)', 'log')

  constructor() {
    super()

    this.format = format.combine(format.uncolorize())
  }

  log?(info: any, next: () => void): any {
    this.outputchannel.appendLine(info[MESSAGE])

    next()
  }
}
