import winston from 'winston'

export function initializeLogger() {
  const log = winston.createLogger({
    transports: [
      new winston.transports.Console({
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        format: winston.format.printf((info) => `[${info.level}]: ${info.message}`),
      }),
    ],
  })

  global.log = log
}
