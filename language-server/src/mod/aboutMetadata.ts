import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import winston from 'winston'
import { LogToken } from '../log'
import { About } from './about'
import { NotificationEventManager } from '../notificationEventManager'
import { File, XMLFile } from '../fs'
import * as path from 'path'
import _ from 'lodash'
import * as xml from '../utils/xml'
import * as cheerio from 'cheerio'
import { AsEnumerable } from 'linq-es2015'

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
<Metadata>
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
</Metadata>
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

  /**
   * @param version project version without prefix v
   */
  get(version: string): MetadataItem | undefined {
    return this.itemMap.get(`v${version}`) ?? this.defaultItem
  }

  update(data: string): void {
    this.log.debug(`${AboutMetadata.fileName} changed.`)
    this.itemMap.clear()

    this.rawXML = data
    this.parseXML()

    this.event.emit('aboutMetadataChanged', this)
  }

  private async parseXML(): Promise<void> {
    this.itemMap.clear()

    const $ = xml.parse(this.rawXML)

    const items = AsEnumerable($('Metadata > versions').children())
      .Select((elem) => this.parseMetadataItem(elem))
      .Where((item) => !!item)
      .Cast<MetadataItem>()
      .ToArray()

    for (const item of items) {
      this.itemMap.set(item.version, item)
    }

    if ($('Metadata > default').length > 0) {
      this.defaultItem = this.parseMetadataItem($('Metadata > default')[0])
    } else {
      this.defaultItem = undefined
    }
  }

  /**
   * create MetadataItem of specific version.
   */
  private parseMetadataItem(elem: cheerio.Element): MetadataItem | undefined {
    const version = elem.tagName
    const $ = cheerio.load(elem, { xmlMode: true })

    const optionalModDependencyPackageIds = $('modDependency > optional > li > packageId')
      .toArray()
      .map((e) => $(e).text())

    return {
      version,
      modDependency: {
        optional: optionalModDependencyPackageIds.map((id) => ({
          packageId: id,
        })),
      },
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
