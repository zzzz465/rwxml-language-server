import { container } from 'tsyringe'
import * as winston from 'winston'

export const LogToken = Symbol('LogToken')

export function initializeLogger(level: string) {
  const log = winston.createLogger({
    transports: [new winston.transports.Console({ level })],
    format: winston.format.printf((info) => `[${info.level}] ${info.message}`),
  })

  container.register(LogToken, { useValue: log })
}
