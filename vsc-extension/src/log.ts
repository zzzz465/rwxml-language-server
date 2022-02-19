import { container } from 'tsyringe'
import * as winston from 'winston'

export const LogLevelToken = Symbol('LogLevelToken')

export function initializeLogger() {
  const log = winston
}
