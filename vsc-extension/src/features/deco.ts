import { AsEnumerable } from 'linq-es2015'
import { container } from 'tsyringe'
import vscode, { Disposable, window } from 'vscode'
import * as ls from 'vscode-languageclient'
import { DocumentTokenRequest } from '../events'
import { DocumentToken, TokenType } from '../types/documentToken'
import { rangeJSONToRange } from '../utils/range'

let timeout: NodeJS.Timeout | undefined = undefined

function triggerDecoration(): void {
  const client = container.resolve(ls.LanguageClient)
  const uri = window.activeTextEditor?.document.uri.toString()
  if (uri) {
    updateDecoration(client, uri)
  }
}

export function registerDecoHook(): Disposable[] {
  const disposables: Disposable[] = [
    new (class implements Disposable {
      timer = setInterval(triggerDecoration, 300)
      dispose(): void {
        clearInterval(this.timer)
      }
    })(),
    window.onDidChangeActiveTextEditor(triggerDecoration),
    window.onDidChangeVisibleTextEditors(triggerDecoration),
  ]

  return disposables
}

export function updateDecoration(client: ls.LanguageClient, uri: string, timeout_ms = 250): void {
  if (timeout === undefined) {
    timeout = setTimeout(async () => {
      await _updateDecoration(client, uri)
      timeout = undefined
    }, timeout_ms)
  }
}

async function _updateDecoration(client: ls.LanguageClient, uri: string): Promise<void> {
  const response = await client.sendRequest(DocumentTokenRequest, { uri })
  if (uri === vscode.window.activeTextEditor?.document.uri.toString()) {
    applyDecos(response.tokens)
  }
}

// https://stackoverflow.com/questions/47117621/how-to-get-the-vscode-theme-color-in-vscode-extensions
const decos: Partial<Record<TokenType, vscode.TextEditorDecorationType>> = {
  tag: vscode.window.createTextEditorDecorationType({
    color: 'gray',
  }),
  'injectable.content.defReference': vscode.window.createTextEditorDecorationType({
    // color: 'red',
  }),
  'injectable.content.defReference.linked': vscode.window.createTextEditorDecorationType({
    cursor: 'pointing',
    textDecoration: 'underline',
  }),
  'injectable.open.parentNameAttributeValue': vscode.window.createTextEditorDecorationType({
    // color: 'red',
  }),
  'injectable.open.parentNameAttributeValue.linked': vscode.window.createTextEditorDecorationType({
    cursor: 'pointing',
    textDecoration: 'underline',
  }),
}

function applyDecos(tokens: DocumentToken[]): void {
  const activeEditor = vscode.window.activeTextEditor

  if (!activeEditor) {
    return
  }

  const enabled = vscode.workspace.getConfiguration('rwxml.codeHighlighting').get('enabled')

  const items = AsEnumerable(tokens)
    .GroupBy((token) => token.type)
    .ToMap(
      (group) => group.key,
      (group) => [...group.values()]
    )

  for (const [key, deco] of Object.entries(decos)) {
    const ranges = (items.get(key as TokenType) ?? []).map((token) => rangeJSONToRange(token.range))

    if (enabled) {
      activeEditor.setDecorations(deco, ranges)
    } else {
      activeEditor.setDecorations(deco, [])
    }
  }
}
