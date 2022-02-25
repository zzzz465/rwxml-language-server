import { Disposable, window } from 'vscode'
import vscode from 'vscode'
import { LanguageClient, Range } from 'vscode-languageclient'
import { DefaultDictionary } from 'typescript-collections'
import { container } from 'tsyringe'
import { DocumentTokenRequest } from '../events'
import { DocumentToken, TokenType } from '../types/documentToken'
import { AsEnumerable } from 'linq-es2015'

let timeout: NodeJS.Timeout | undefined = undefined

function triggerDecoration() {
  const client = container.resolve(LanguageClient)
  const uri = window.activeTextEditor?.document.uri.toString()
  if (uri) {
    updateDecoration(client, uri)
  }
}

export function registerDecoHook(): Disposable[] {
  const disposables: Disposable[] = [
    new (class implements Disposable {
      timer = setInterval(triggerDecoration, 300)
      dispose() {
        clearInterval(this.timer)
      }
    })(),
    window.onDidChangeActiveTextEditor(triggerDecoration),
    window.onDidChangeVisibleTextEditors(triggerDecoration),
  ]

  return disposables
}

export function updateDecoration(client: LanguageClient, uri: string, timeout_ms = 250) {
  if (timeout === undefined) {
    timeout = setTimeout(async () => {
      await _updateDecoration(client, uri)
      timeout = undefined
    }, timeout_ms)
  }
}

async function _updateDecoration(client: LanguageClient, uri: string) {
  try {
    const response = await client.sendRequest(DocumentTokenRequest, { uri })

    // still watching same response
    if (uri === vscode.window.activeTextEditor?.document.uri.toString()) {
      applyDecos(response.tokens)
    }
  } catch (err) {
    console.warn('warn: deco request throw error: ', err)
  }
}

const decos: Partial<Record<TokenType, vscode.TextEditorDecorationType>> = {
  tag: vscode.window.createTextEditorDecorationType({
    color: 'gray',
  }),
  'injectable.content.defReference.linked': vscode.window.createTextEditorDecorationType({
    cursor: 'pointing',
    textDecoration: 'underline',
  }),
}

function applyDecos(tokens: DocumentToken[]): void {
  const activeEditor = vscode.window.activeTextEditor

  if (!activeEditor) {
    return
  }

  const items = AsEnumerable(tokens)
    .GroupBy((token) => token.type)
    .ToMap(
      (group) => group.key,
      (group) => [...group.values()]
    )

  for (const [key, deco] of Object.entries(decos)) {
    const ranges = (items.get(key as TokenType) ?? []).map((token) => rangeJSONToRange(token.range))
    activeEditor.setDecorations(deco, ranges)
  }
}

function rangeJSONToRange(range: Range): vscode.Range {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character)
  )
}
