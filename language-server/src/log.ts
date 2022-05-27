import * as tsyringe from 'tsyringe'
import winston, { format } from 'winston'
import { Configuration } from './configuration'

const KEY_SCOPE = 'rwxml.logs'
const KEY_LOG_LEVEL = 'level'
const DEFAULT_LOG_LEVEL = 'info'

export const DefaultLogToken = Symbol('DefaultLogToken')

@tsyringe.singleton()
export class LogManager {
  readonly defaultLogger = winston.createLogger({
    format: format.combine(logFormat),
    level: DEFAULT_LOG_LEVEL,
    transports: [new winston.transports.Console()],
  })

  constructor(private readonly conf: Configuration) {
    // NOTE: most logger will use the defaultLogger as transport target. so I increase the max limit.
    // NOTE: possible memory leak?
    this.defaultLogger.setMaxListeners(50)
  }

  async init(): Promise<void> {
    this.setLoggerLevel(await this.level())

    this.conf.events.on('onConfigurationChanged', () => this.onConfigurationChanged())
  }

  async level(): Promise<string> {
    return this.conf.get({ scopeUri: KEY_SCOPE, section: KEY_LOG_LEVEL }, DEFAULT_LOG_LEVEL)
  }

  private setLoggerLevel(level: string): void {
    this.defaultLogger.level = level
  }

  private async onConfigurationChanged(): Promise<void> {
    this.setLoggerLevel(await this.level())
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
