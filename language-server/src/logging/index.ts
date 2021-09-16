import { TransformableInfo } from '.pnpm/logform@2.2.0/node_modules/logform'
import winston from 'winston'

export function initializeLogger() {
  winston.configure({
    transports: [
      new winston.transports.Console({
        format: winston.format.printf((info) => `[${info.level}]: ${info.message}`),
      }),
    ],
  })
}

global.log = winston
