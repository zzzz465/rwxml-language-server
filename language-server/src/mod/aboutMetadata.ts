import EventEmitter from 'events'
import * as tsyringe from 'tsyringe'
import winston from 'winston'
import { LogToken } from '../log'
import { About } from './about'
import { NotificationEventManager } from '../notificationEventManager'
import { File, XMLFile } from '../fs'
import * as path from 'path'
import * as xml from '../utils/xml'
import * as cheerio from 'cheerio'
import { AsEnumerable } from 'linq-es2015'
import { URI } from 'vscode-uri'
import { FileStore } from '../fileStore'
import TypedEventEmitter from 'typed-emitter'

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

type Events = {
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
  static readonly relativePathFromRoot = './About/metadata_rwxml.xml'
  static readonly fileName = 'metadata_rwxml.xml'

  private logFormat = winston.format.printf((info) => `[${info.level}] [${AboutMetadata.name}] ${info.message}`)
  private readonly log: winston.Logger

  readonly event = new EventEmitter() as TypedEventEmitter<Events>

  private filePath: URI = URI.parse('')
  private rawXML = ''
  private defaultItem?: MetadataItem = undefined
  private readonly itemMap: Map<string, MetadataItem> = new Map()

  constructor(
    notiEventManager: NotificationEventManager,
    @tsyringe.inject(LogToken) baseLogger: winston.Logger,
    @tsyringe.inject(tsyringe.delay(() => About)) private readonly about: About,
    private readonly fileStore: FileStore
  ) {
    this.log = winston.createLogger({ transports: baseLogger.transports, format: this.logFormat })

    about.event.on('aboutChanged', (about) => this.onAboutChanged(about))
    notiEventManager.preEvent.on('fileAdded', (file) => this.onFileChanged(file))
    notiEventManager.preEvent.on('fileChanged', (file) => this.onFileChanged(file))
  }

  /**
   * @param version project version without prefix v
   */
  get(version: string): MetadataItem | undefined {
    return this.itemMap.get(`v${version}`) ?? this.defaultItem
  }

  private update(data: string): void {
    this.itemMap.clear()

    this.rawXML = data
    this.parseXML()

    this.log.debug('aboutMetadata updated.')
    this.log.debug(`items: ${JSON.stringify(this.itemMap, null, 4)}`)
    this.log.debug(`default: ${JSON.stringify(this.defaultItem, null, 4)}`)

    this.event.emit('aboutMetadataChanged', this)
  }

  /**
   * parseXML() parses xml from given text.
   */
  private parseXML(): void {
    this.itemMap.clear()

    this.log.silly(`aboutMetadata content below.\n${this.rawXML}\n`)
    const $ = xml.parse(this.rawXML)

    const items = AsEnumerable($('Metadata > versions').children())
      .Select((elem) => this.parseMetadataItem(elem))
      .Where((item) => !!item)
      .Cast<MetadataItem>()
      .ToArray()

    this.log.silly(`aboutMetadata parsed items: ${JSON.stringify(items, null, 4)}`)

    for (const item of items) {
      this.itemMap.set(item.version, item)
    }

    if ($('Metadata > default').length > 0) {
      this.defaultItem = this.parseMetadataItem($('Metadata > default')[0])
    } else {
      this.defaultItem = undefined
    }

    this.log.silly(`aboutMetadata parsed default: ${JSON.stringify(this.defaultItem, null, 4)}`)
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

  private onAboutChanged(about: About): void {
    const newMetadataPath = path.resolve(about.rootDirectory.fsPath, AboutMetadata.relativePathFromRoot)

    if (newMetadataPath === this.filePath.fsPath) {
      return
    }

    this.filePath = URI.file(newMetadataPath)
    this.log.debug(`reloading because About.xml path is changed. new source: ${this.filePath.toString()}`)
    this.reload()
  }

  private onFileChanged(file: File): void {
    if (file.uri.toString() === this.filePath.toString()) {
      this.reload()
    }
  }

  /**
   * reload() reloads aboutMetadata loading from fileStore.
   */
  private async reload(): Promise<void> {
    const file = this.fileStore.get(this.filePath.toString())
    if (!(file instanceof XMLFile)) {
      return this.update('')
    }

    const raw = await file.read()

    this.update(raw)
  }
}
