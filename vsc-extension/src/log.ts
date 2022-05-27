import * as tsyringe from 'tsyringe'
import vscode, { ConfigurationChangeEvent } from 'vscode'
import { Disposable } from 'vscode-languageclient'
import * as winston from 'winston'

const KEY_SCOPE = 'rwxml.logs'
const KEY_LOG_LEVEL = 'level'
const DEFAULT_LOG_LEVEL = 'info'

export const DefaultLogToken = Symbol('DefaultLogToken')

@tsyringe.singleton()
export class LogManager {
  readonly defaultLogger = winston.createLogger({
    format: winston.format.cli({ all: true }),
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

export const className = winston.format((info, classType: new (...p: any[]) => any) => {
  info.className = classType.name

  return info
})

export const logFormat = winston.format.printf(
  ({ level, className, message }) => `[${level}] [${className}]: ${message}`
)

export const logIdFormat = winston.format.printf(
  ({ level, className, uuid: id, message }) => `[${level}] [${className}] (${id}): ${message}`
)

export default function defaultLogger() {
  return tsyringe.container.resolve<winston.Logger>(DefaultLogToken)
}
