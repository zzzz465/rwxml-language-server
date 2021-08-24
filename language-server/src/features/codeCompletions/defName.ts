import { Injectable } from '@rwxml/analyzer'
import { CompletionItem, CompletionItemKind, InsertTextFormat, InsertTextMode, TextEdit } from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'

/*
1. trie 알고리즘을 기반으로 함?
2. string 을 각 단어별로 쪼갬, 이 것을 node 라고 부르자.
3. 각 node 는 string 에서 index 를 가짐
4. char 기반의 node map 이 있음
5. 현재 검색중인 문자열 길이보다 ...??? 이게 맞나?

원하는 것은 skip 을 구현하는 것.
그러면, skip 할 수 있게 pointer 를 줘야하나?
*/

export function completeDefName(project: Project, currentNode: Injectable): CompletionItem[] {
  const ret: CompletionItem[] = []
  const uri = currentNode.document.uri
  const text = currentNode.content
  const fieldType = currentNode.fieldInfo?.fieldType
  const defType = fieldType?.getDefType()

  if (fieldType && defType) {
    const defs = project.defManager
      .getDef(defType)
      .map((def) => def.getDefName())
      .filter((defName) => !!defName) as string[]

    const completionTexts = getMatchingText(defs, text ?? '')

    for (const completion of completionTexts) {
      if (text) {
        // when <tag>...text...</tag>
        const range = project.rangeConverter.toLanguageServerRange(currentNode.contentRange, uri)
        if (range) {
          const textEdit = TextEdit.replace(range, completion)
          ret.push({
            label: completion,
            kind: CompletionItemKind.Value,
            textEdit,
          })
        } else {
          console.error(`cannot get range of completion: ${completion} for node: ${currentNode.name}, uri: ${uri}`)
        }
      } else {
        // when <tag></tag>
        ret.push({
          label: completion,
          kind: CompletionItemKind.Value,
          insertTextFormat: InsertTextFormat.PlainText,
        })
      }
    }
  }

  return ret
}
