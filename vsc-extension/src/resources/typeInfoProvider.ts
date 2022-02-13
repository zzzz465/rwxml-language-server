import { registry } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { Mod } from '../mod'
import { Provider, ProviderSymbol } from './type'

@registry([
  {
    token: ProviderSymbol,
    useClass: TypeInfoProvider,
  },
])
export class TypeInfoProvider implements Provider {
  listen(client: LanguageClient): void {
    throw new Error('Method not implemented.')
  }
}
