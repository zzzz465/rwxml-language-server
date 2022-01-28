import EventEmitter from 'events'
import { TextureFile, AudioFile } from '.'
import { LoadFolder } from '../mod/loadfolders'
import { RimWorldVersion } from '../typeInfoMapManager'
import { Counter } from '../utils/counter'
import path from 'path'

interface ListeningEvents {
  fileAdded(file: File): void
  fileChanged(file: File): void
  fileDeleted(file: File): void
}

export class ResourceManager {
  textures: Set<string> = new Set()
  audios: Set<string> = new Set()
  audioDirectories = new Counter<string>()

  constructor(private readonly version: RimWorldVersion, private readonly loadFolder: LoadFolder) {}

  listen(event: EventEmitter<ListeningEvents>) {
    event.on('fileAdded', this.onFileAdded.bind(this))
    event.on('fileChanged', this.onFileChanged.bind(this))
    event.on('fileDeleted', this.onFileDeleted.bind(this))
  }

  private onFileAdded(file: File) {
    if (file instanceof TextureFile) {
      this.onTextureFileChanged(file)
    } else if (file instanceof AudioFile) {
      this.onAudioFileChanged(file)
    }
  }

  private onFileChanged(file: File) {
    if (file instanceof TextureFile) {
      this.onTextureFileChanged(file)
    } else if (file instanceof AudioFile) {
      this.onAudioFileChanged(file)
    }
  }

  private onFileDeleted(file: File) {
    if (file instanceof TextureFile) {
      this.onTextureFileDeleted(file)
    } else if (file instanceof AudioFile) {
      this.onAudioFileDeleted(file)
    }
  }

  private onTextureFileChanged(file: TextureFile) {
    const resourcePath = this.loadFolder.getResourcePath(file.uri, this.version)
    if (resourcePath) {
      log.debug(`texture added, version: ${this.version}, uri: ${file.toString()}`)
      this.textures.add(resourcePath)
    }
  }

  private onTextureFileDeleted(file: TextureFile) {
    const resourcePath = this.loadFolder.getResourcePath(file.uri, this.version)
    if (resourcePath) {
      log.debug(`texture deleted, version: ${this.version}, uri: ${file.toString()}`)
      this.textures.delete(resourcePath)
    }
  }

  private onAudioFileChanged(file: AudioFile) {
    const resourcePath = this.loadFolder.getResourcePath(file.uri, this.version)
    if (resourcePath) {
      const resourceDir = path.dirname(resourcePath)

      log.debug(`audio changed, version: ${this.version}, uri: ${file.toString()}`)
      this.audios.add(resourcePath)
      this.audioDirectories.add(resourceDir)
    }
  }

  private onAudioFileDeleted(file: AudioFile) {
    const resourcePath = this.loadFolder.getResourcePath(file.uri, this.version)
    if (resourcePath) {
      const resourceDir = path.dirname(resourcePath)

      log.debug(`audio deleted, version: ${this.version}, uri: ${file.toString()}`)
      this.audios.delete(resourcePath)
      this.audioDirectories.remove(resourceDir)
    }
  }
}
