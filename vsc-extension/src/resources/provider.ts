import { registry } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { TextProvider } from './textProvider'
import { TypeInfoProvider } from './typeInfoProvider'

@registry([
  { token: Provider.token, useClass: TextProvider },
  { token: Provider.token, useClass: TypeInfoProvider },
])
export abstract class Provider {
  static readonly token = Symbol('ProviderSymbol')

  abstract listen(client: LanguageClient): void
}
