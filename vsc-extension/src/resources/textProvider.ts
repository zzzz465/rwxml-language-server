import { injectable, registry } from 'tsyringe'
import { LanguageClient } from 'vscode-languageclient'
import { Mod } from '../mod/mod'
import { Provider, ProviderSymbol } from './type'

@registry([
  {
    token: ProviderSymbol,
    useClass: TextProvider,
  },
])
export class TextProvider implements Provider {
  listen(client: LanguageClient): void {
    throw new Error('Method not implemented.')
  }
}
