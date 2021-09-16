import { TransformableInfo } from '.pnpm/logform@2.2.0/node_modules/logform'
import winston from 'winston'

export function initializeLogger() {
  winston.configure({
    transports: [
      new winston.transports.Console({
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        format: winston.format.printf((info) => `[${info.level}]: ${info.message}`),
      }),
    ],
  })
}

global.log = winston
