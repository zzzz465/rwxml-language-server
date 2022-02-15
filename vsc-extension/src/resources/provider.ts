import { registry } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyResourceProvider } from './dependencyResourceProvider'
import { ResourceExistsProvider } from './resourceExistsProvider'
import { TextProvider } from './textProvider'
import { TypeInfoProvider } from './typeInfoProvider'

@registry([
  { token: Provider.token, useClass: TextProvider },
  { token: Provider.token, useClass: TypeInfoProvider },
  { token: Provider.token, useClass: DependencyResourceProvider },
  { token: Provider.token, useClass: ResourceExistsProvider },
])
export abstract class Provider {
  static readonly token = Symbol('ProviderSymbol')

  abstract listen(client: LanguageClient): void
}
