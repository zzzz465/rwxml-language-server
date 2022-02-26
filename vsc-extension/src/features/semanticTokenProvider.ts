import * as tsyringe from 'tsyringe'
import vscode from 'vscode'
import * as ls from 'vscode-languageclient'
import { DocumentTokenRequest } from '../events'
import { TokenType } from '../types/documentToken'
import { rangeJSONToRange } from '../utils/range'

// https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#standard-token-types-and-modifiers
const tokenTypes: string[] = ['class', 'enum', 'typeParameter', 'type', 'enumMember', 'variable', 'property']
const tokenModifiers: string[] = ['definition']
const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers)

type TokenMapType = Partial<Record<TokenType, { token: string; modifiers?: string[] }>>
const tokenMap: TokenMapType = {
  'def.open.name': { token: 'class', modifiers: ['definition'] },
  'def.close.name': { token: 'class', modifiers: ['definition'] },
  'def.open.classAttribute': { token: 'typeParameter' },
  'def.open.classAttributeValue': { token: 'class' },
  'def.open.AbstractAttribute': { token: 'enum' },
  'def.open.AbstractAttributeValue': { token: 'enumMember' },
  'def.open.parentNameAttribute': { token: 'property' },
  'def.open.parentNameAttributeValue': { token: 'variable' },
  'injectable.open.name': { token: 'property' },
  'injectable.close.name': { token: 'property' },
  'injectable.open.classAttribute': { token: 'typeParameter' },
  'injectable.open.classAttributeValue': { token: 'class' },
  'injectable.open.AbstractAttribute': { token: 'enum' },
  'injectable.open.AbstractAttributeValue': { token: 'enumMember' },
}

@tsyringe.injectable()
export class SemanticTokenProvider implements vscode.DocumentSemanticTokensProvider {
  readonly legend = legend

  constructor(private readonly client: ls.LanguageClient) {}

  async provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    cancelToken: vscode.CancellationToken
  ): Promise<vscode.SemanticTokens | null | undefined> {
    const res = await this.client.sendRequest(DocumentTokenRequest, { uri: document.uri.toString() })
    if (cancelToken.isCancellationRequested || document.uri.toString() !== res.uri) {
      return null
    }

    const tokensBuilder = new vscode.SemanticTokensBuilder(legend)

    for (const token of res.tokens) {
      const data = tokenMap[token.type]
      if (!data) {
        continue
      }
      tokensBuilder.push(rangeJSONToRange(token.range), data.token, data.modifiers)
    }

    return tokensBuilder.build()
  }
}
