import { registry } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { DependencyResourceProvider } from './dependencyResourceProvider'
import { TextProvider } from './textProvider'
import { TypeInfoProvider } from './typeInfoProvider'

@registry([
  { token: Provider.token, useClass: TextProvider },
  { token: Provider.token, useClass: TypeInfoProvider },
  { token: Provider.token, useClass: DependencyResourceProvider },
])
export abstract class Provider {
  static readonly token = Symbol('ProviderSymbol')

  abstract listen(client: LanguageClient): void
}
