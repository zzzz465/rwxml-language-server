import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import winston from 'winston'
import { LogToken } from '../log'
import { About } from './about'
import * as xml2js from 'xml2js'

/**
 * MetadataItem holds various data of a specific version.
 */
export interface MetadataItem {
  version: string
  modDependency?: {
    optional?: {
      packageId: string
    }[]
  }
}

interface Events {
  aboutMetadataChanged(data: AboutMetadata): void
}

/**
 * AboutMetadata provides additional data that about.xml doesn't support.
 */
@tsyringe.singleton()
export class AboutMetadata {
  private logFormat = winston.format.printf((info) => `[${info.level}] [${AboutMetadata.name}] ${info.message}`)
  private readonly log: winston.Logger

  readonly event: EventEmitter<Events> = new EventEmitter()

  private rawXML = ''
  private readonly itemMap: Map<string, MetadataItem> = new Map()

  constructor(
    @tsyringe.inject(LogToken) baseLogger: winston.Logger,
    @tsyringe.inject(tsyringe.delay(() => About)) private readonly about: About
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })
  }

  get(version: string): MetadataItem | undefined {
    return this.itemMap.get(version)
  }

  async update(data: string): Promise<void> {
    this.log.silly('AboutMetadata.xml changed.')
    this.itemMap.clear()

    this.rawXML = data
    await this.parseXML()

    this.event.emit('aboutMetadataChanged', this)
  }

  private async parseXML(): Promise<void> {
    const data = await xml2js.parseStringPromise(this.rawXML)

    for (const version of this.about.supportedVersions) {
      if (data[version]) {
        this.itemMap.set(version, data.version)
      }
    }
  }
}
