// manages all file in project

import { createNanoEvents, DefaultEvents, Emitter } from 'nanoevents'
import { Disposable } from 'vscode-languageserver'
import { File } from './file'

export interface Events extends DefaultEvents {
  created(): void
  dispose(): void
}

export class FileManager implements Disposable {
  readonly fileEvent: Emitter<Events> = createNanoEvents()

  FileCreated(file: File) {}

  FileChanged(file: File) {}

  FileDeleted(file: File) {}

  dispose() {
    this.fileEvent.emit('dispose')
  }
}
