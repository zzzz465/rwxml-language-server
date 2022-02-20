import { registry } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { CachedTypeInfoProvider } from './cachedTypeInfoProvider'
import { DependencyResourceProvider } from './dependencyResourceProvider'
import { ResourceExistsProvider } from './resourceExistsProvider'
import { TextProvider } from './textProvider'

@registry([
  { token: Provider.token, useClass: TextProvider },
  { token: Provider.token, useClass: DependencyResourceProvider },
  { token: Provider.token, useClass: ResourceExistsProvider },
  { token: Provider.token, useClass: CachedTypeInfoProvider },
  // { token: Provider.token, useClass: TypeInfoProvider },
])
export abstract class Provider {
  static readonly token = Symbol('ProviderSymbol')

  abstract listen(client: LanguageClient): void
}
