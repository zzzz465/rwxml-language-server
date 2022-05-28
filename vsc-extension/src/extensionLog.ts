import { MESSAGE } from 'triple-beam'
import vscode from 'vscode'
import { format } from 'winston'
import Transport from 'winston-transport'

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
