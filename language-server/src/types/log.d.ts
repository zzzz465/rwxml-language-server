import winston from 'winston'

declare global {
  namespace NodeJS {
    interface Global {
      log: winston
    }
  }
  const log: winston.Logger
}

export {}
