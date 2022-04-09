import * as tsyringe from 'tsyringe'
import { DelayedConstructor } from 'tsyringe/dist/typings/lazy-helpers'
import { constructor } from 'tsyringe/dist/typings/types'
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

type ReturnType0 = Parameters<typeof tsyringe.registry>[0]

function items(...classes: (constructor<any> | DelayedConstructor<any>)[]): ReturnType0 {
  return classes.map((cls) => ({
    token: InitRegistry.token,
    useClass: cls,
  }))
}

@tsyringe.registry(
  items(
    Configuration,
    About,
    LoadFolder,
    TextDocumentManager,
    NotificationEventManager,
    ProjectManager,
    LanguageFeature,
    ModManager,
    FileStore,
    // TextDocumentsAdapter,
    AboutMetadata
  )
)
export class InitRegistry {
  static readonly token = Symbol(InitRegistry.name)

  static init(c = tsyringe.container): void {
    c.resolveAll(InitRegistry.token)
  }
}
