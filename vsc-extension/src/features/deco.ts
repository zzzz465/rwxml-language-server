import { Disposable } from 'vscode'
import vscode from 'vscode'
const { createTextEditorDecorationType } = vscode.window
import { LanguageClient, Range } from 'vscode-languageclient'
import { XMLDocumentDecoItemRequest } from '../events'
import { DecoItem, DecoType } from '../types'
import { DefaultDictionary } from 'typescript-collections'

let timeout: NodeJS.Timeout | undefined = undefined

export function updateDecoration(client: LanguageClient, uri: string, timeout_ms = 250) {
  if (timeout !== undefined) {
    clearTimeout(timeout)
  }

  timeout = setTimeout(async () => {
    await _updateDecoration(client, uri), timeout_ms
    timeout = undefined
  })
}

async function _updateDecoration(client: LanguageClient, uri: string) {
  const response = await client.sendRequest(XMLDocumentDecoItemRequest, { uri })

  // still watching same response
  if (uri === vscode.window.activeTextEditor?.document.uri.toString()) {
    applyDecos(response.items)
  }
}

function applyDecos(decoItems: DecoItem[]): void {
  const activeEditor = vscode.window.activeTextEditor

  if (!activeEditor) {
    return
  }

  const dict = new DefaultDictionary<DecoType, vscode.Range[]>(() => [])

  for (const deco of decoItems) {
    const array = dict.getValue(deco.decoType)

    switch (deco.decoType) {
      case 'content_defName': {
        array.push(rangeJSONToRange(deco.range))
        break
      }
    }
  }

  activeEditor.setDecorations(decos.content.defName, dict.getValue('content_defName'))
}

function rangeJSONToRange(range: Range): vscode.Range {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character)
  )
}

const decos = {
  content: {
    defName: createTextEditorDecorationType({
      cursor: 'pointing',
      textDecoration: 'underline',
    }),
  },
}
