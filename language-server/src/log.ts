import * as tsyringe from 'tsyringe'
import winston, { format } from 'winston'
import { Configuration } from './configuration'

const KEY_SCOPE = 'rwxml.logs'
const DEFAULT_LOG_LEVEL = 'info'

@tsyringe.singleton()
export class LogManager {
  readonly defaultLogger = winston.createLogger({
    format: format.combine(logFormat),
    level: DEFAULT_LOG_LEVEL,
    transports: [new winston.transports.Console()],
  })

  private initialized = false

  constructor(private readonly conf: Configuration) {
    // NOTE: most logger will use the defaultLogger as transport target. so I increase the max limit.
    // NOTE: possible memory leak?
    this.defaultLogger.setMaxListeners(999999)
  }

  async init(logLevel: string): Promise<void> {
    if (!this.initialized) {
      this.setLoggerLevel(logLevel)
      this.conf.events.on('onConfigurationChanged', () => this.onConfigurationChanged())
      this.initialized = true
    }
  }

  async level(): Promise<string> {
    // FIXME: init step 에서는 connection intialized 가 되지 않았으므로, level() 을 호출하면 unhandled method 에러가 발생함
    return (await this.conf.get<any>({ section: KEY_SCOPE }))?.level ?? DEFAULT_LOG_LEVEL
  }

  private setLoggerLevel(level: string): void {
    this.defaultLogger.level = level
    console.log(`log level changed to ${this.defaultLogger.level}`)
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

export default function defaultLogger(): winston.Logger {
  return tsyringe.container.resolve(LogManager).defaultLogger
}
