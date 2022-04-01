import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import winston from 'winston'
import { LogToken } from '../log'
import { About } from './about'
import * as xml2js from 'xml2js'
import { NotificationEventManager } from '../notificationEventManager'
import { File, XMLFile } from '../fs'
import * as path from 'path'
import _ from 'lodash'

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
 * @example
```xml
<?xml version="1.0" encoding="utf-8"?>
<Data>
    <spec>
        <default>
            <modDependency>
                <optional>
                    <li>
                        <packageId>erdelf.HumanoidAlienRaces</packageId>
                    </li>
                </optional>
            </modDependency>
        </default>
        <versions>
            <v1.3>
                <modDependency>
                    <optional>
                        <li>
                            <packageId>erdelf.HumanoidAlienRaces</packageId>
                            <packageId>goudaquiche.MoharFramework</packageId>
                        </li>
                    </optional>
                </modDependency>
            </v1.3>
        </versions>
    </spec>
</Data>
```
 */
@tsyringe.singleton()
export class AboutMetadata {
  static readonly fileName = 'metadata_rwxml.xml'

  private logFormat = winston.format.printf((info) => `[${info.level}] [${AboutMetadata.name}] ${info.message}`)
  private readonly log: winston.Logger

  readonly event: EventEmitter<Events> = new EventEmitter()

  private rawXML = ''
  private defaultItem?: MetadataItem = undefined
  private readonly itemMap: Map<string, MetadataItem> = new Map()

  constructor(
    notiEventManager: NotificationEventManager,
    @tsyringe.inject(LogToken) baseLogger: winston.Logger,
    @tsyringe.inject(tsyringe.delay(() => About)) private readonly about: About
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })

    notiEventManager.preEvent.on('fileChanged', _.debounce(this.onFileChanged.bind(this), 500))
  }

  get(version: string): MetadataItem | undefined {
    return this.itemMap.get(version) ?? this.defaultItem
  }

  async update(data: string): Promise<void> {
    this.log.info(`${AboutMetadata.fileName} changed.`)
    this.itemMap.clear()

    this.rawXML = data
    await this.parseXML()

    this.event.emit('aboutMetadataChanged', this)
  }

  private async parseXML(): Promise<void> {
    let data: Record<string, any> = {}
    try {
      data = await xml2js.parseStringPromise(this.rawXML)
    } catch (e) {
      this.log.error(`error while parsing ${AboutMetadata.fileName}. error: "${e}"`)
      return
    }

    const versions = data.versions
    if (versions) {
      for (const version of this.about.supportedVersions) {
        if (versions[version]) {
          this.itemMap.set(version, versions[`v${version}`])
        }
      }
    }

    if (data.default) {
      this.defaultItem = data.default
    }
  }

  private async onFileChanged(file: File) {
    if (isMetadataFile(file)) {
      const data = await file.read()
      this.update(data)
    }
  }
}

export function isMetadataFile(file: File): file is XMLFile & boolean {
  const fsPath = file.uri.fsPath
  const name = path.basename(path.normalize(fsPath))
  const dirname = path.basename(path.dirname(fsPath))

  return file instanceof XMLFile && dirname.toLowerCase() === 'about' && name.toLowerCase() === 'metadata_rwxml.xml'
}
