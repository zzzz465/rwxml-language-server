import * as tsyringe from 'tsyringe'
import vscode, { ConfigurationChangeEvent } from 'vscode'
import { Disposable } from 'vscode-languageclient'
import winston, { format } from 'winston'

const KEY_SCOPE = 'rwxml.logs'
const KEY_LOG_LEVEL = 'level'
const DEFAULT_LOG_LEVEL = 'info'

export const DefaultLogToken = Symbol('DefaultLogToken')

@tsyringe.singleton()
export class LogManager {
  readonly defaultLogger = winston.createLogger({
    format: format.combine(format.colorize({ all: true }), logFormat),
    level: DEFAULT_LOG_LEVEL,
    transports: [new winston.transports.Console()],
  })

  init(): Disposable {
    this.setLoggerLevel(this.level())

    return vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged)
  }

  level(): string {
    return vscode.workspace.getConfiguration(KEY_SCOPE).get<string>(KEY_LOG_LEVEL, DEFAULT_LOG_LEVEL)
  }

  private setLoggerLevel(level: string): void {
    this.defaultLogger.level = level
  }

  private onConfigurationChanged(e: ConfigurationChangeEvent): void {
    if (!e.affectsConfiguration('rwxml.logs')) {
      return
    }

    this.setLoggerLevel(this.level())
  }
}

export const className = format((info, classType?: new (...p: any[]) => any) => {
  info.className = classType?.name ?? 'NONTYPE'

  return info
})

export const logFormat = format.printf(({ level, className, id, message }) =>
  id ? `[${level}]\t[${className}]\t(${id}):\t${message}` : `[${level}]\t[${className}]:\t${message}`
)

export default function defaultLogger() {
  return tsyringe.container.resolve<winston.Logger>(DefaultLogToken)
}
