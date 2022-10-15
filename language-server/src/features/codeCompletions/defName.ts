import { Element, Node, Range, Text, TypedElement } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import { injectable } from 'tsyringe'
import { CompletionItem, CompletionItemKind, CompletionList, TextEdit } from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { CodeCompletionContributor } from './contributor'

/*
1. trie 알고리즘을 기반으로 함?
2. string 을 각 단어별로 쪼갬, 이 것을 node 라고 부르자.
3. 각 node 는 string 에서 index 를 가짐
4. char 기반의 node map 이 있음
5. 현재 검색중인 문자열 길이보다 ...??? 이게 맞나?

원하는 것은 skip 을 구현하는 것.
그러면, skip 할 수 있게 pointer 를 줘야하나?
*/

@injectable()
export class DefNameCompletion implements CodeCompletionContributor {
  constructor(private readonly rangeConverter: RangeConverter) {}

  getCompletion(project: Project, selection: Node, offset: number): CompletionList | null {
    if (!this.shouldSuggestDefNames(selection, offset)) {
      return null
    }

    const node = selection instanceof TypedElement ? selection : selection.parent
    if (!(node instanceof TypedElement)) {
      return null
    }

    const defType = node.typeInfo.getDefType()
    const range = node.contentRange ?? new Range(offset, offset)
    const editRange = this.rangeConverter.toLanguageServerRange(range, node.document.uri)

    if (!(defType && editRange)) {
      return null
    }

    const foundDefs = project.defManager.getDef(defType)

    const defNames = AsEnumerable(foundDefs)
      .Select((def) => def.getDefName())
      .Where((defName) => !!defName)
      .ToArray() as string[]

    const completionTexts = getMatchingText(defNames, node.content ?? '')

    return {
      isIncomplete: false,
      items: completionTexts.map(
        (label) =>
          ({
            label,
            kind: CompletionItemKind.Value,
            textEdit: TextEdit.replace(editRange, label),
          } as CompletionItem)
      ),
    }
  }

  /**
   * is selecting <tag>|</tag> or <tag>...|...</tag> ?
   */
  private shouldSuggestDefNames(node: Node, offset: number): node is Element | Text {
    if (node instanceof Element && node.openTagRange.end === offset) {
      // after > ?
      return true
    } else if (node instanceof Text && node.parent instanceof Element && node.parent.contentRange?.include(offset)) {
      return true
    } else {
      return false
    }
  }
}
