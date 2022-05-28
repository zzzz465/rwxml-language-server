import * as tsyringe from 'tsyringe'
import { InjectionToken } from 'tsyringe'
import { ClientFileEventListener } from './clientFileEventListener'
import { Configuration } from './configuration'
import { LanguageFeature } from './features'
import { FileStore } from './fileStore'
import { About } from './mod'
import { AboutMetadata } from './mod/aboutMetadata'
import { LoadFolder } from './mod/loadfolders'
import { ModManager } from './mod/modManager'
import { NotificationEventManager } from './notificationEventManager'
import { ProjectManager } from './projectManager'
import { TextDocumentManager } from './textDocumentManager'
import { TextDocumentsAdapter } from './textDocumentsAdapter'

export class InitRegistry {
  static readonly InitItems = [
    Configuration,
    About,
    LoadFolder,
    TextDocumentManager,
    NotificationEventManager,
    ProjectManager,
    LanguageFeature,
    ModManager,
    FileStore,
    TextDocumentsAdapter,
    AboutMetadata,
    ClientFileEventListener,
    // TextStore
  ]

  static init(c = tsyringe.container): void {
    for (const token of this.InitItems) {
      c.resolve(token as InjectionToken<any>)
    }
  }
}
